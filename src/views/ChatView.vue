<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ApiError, getApi } from "@/api";
import { useTrainingsStore } from "@/stores/trainings";
import backIcon from "@/assets/onboarding/back.svg";
import replayIcon from "@/assets/onboarding/replay.png";
import personaCpo from "@/assets/onboarding/persona-toxic-cpo.png";
import personaCeo from "@/assets/onboarding/persona-busy-ceo.png";
import type { AgreedTerm, NegotiationState, TurnEvent } from "@/api/types";

const props = defineProps<{
  personaCeo?: string;
  personaCpo?: string;
}>();

const route = useRoute();
const router = useRouter();
const trainings = useTrainingsStore();
const id = computed(() => String(route.params.id));
const state = ref<NegotiationState | null>(null);
const draft = ref("");
const pending = ref(false);
const thinking = ref(false);
const live = ref("");
const error = ref("");
const deal = ref<{ terms: AgreedTerm[]; summary: string } | null>(null);
const endOpen = ref(false);
const ending = ref(false);
const idempotencyKey = ref(crypto.randomUUID());
const scroller = ref<HTMLElement | null>(null);
const thread = ref<HTMLElement | null>(null);
let threadObserver: ResizeObserver | null = null;

function pinToBottom() {
  const el = scroller.value;
  if (el) {
    const next = el.scrollHeight - el.clientHeight;
    if (next > 0) {
      if (el.scrollTop < next - 1) el.scrollTop = next;
      return;
    }
  }
  const page = document.scrollingElement;
  if (!page) return;
  const pageNext = page.scrollHeight - page.clientHeight;
  if (pageNext > 1 && page.scrollTop < pageNext - 1) page.scrollTop = pageNext;
}

async function load() {
  state.value = await getApi().getNegotiation(id.value);
  deal.value = state.value.pending_deal;
  if (state.value.status === "finished")
    await router.replace({ name: "debrief", params: { id: id.value } });
}

function apply(event: TurnEvent) {
  if (!state.value) return;
  if (event.event === "thinking") thinking.value = true;
  if (event.event === "utterance_delta") {
    thinking.value = false;
    live.value += event.data.text;
  }
  if (event.event === "turn_committed") {
    state.value.turn_index = event.data.turn_index;
    state.value.phase = event.data.phase;
    state.value.turns_left = event.data.turns_left;
  }
  if (event.event === "deal_proposed") deal.value = event.data;
  if (event.event === "stream_failed") error.value = event.data.message;
  if (event.event === "counterpart_left" || event.event === "turn_limit_reached") {
    void trainings.refresh().catch(() => {});
    void router.push({ name: "debrief", params: { id: id.value } });
  }
}

async function scrollDown() {
  await nextTick();
  pinToBottom();
  requestAnimationFrame(pinToBottom);
}

async function send() {
  const text = draft.value.trim();
  if (!text || !state.value || pending.value) return;
  error.value = "";
  pending.value = true;
  live.value = "";
  const key = idempotencyKey.value;
  state.value.turns.push({
    index: state.value.turn_index + 1,
    speaker: "player",
    text,
    at: new Date().toISOString(),
  });
  draft.value = "";
  try {
    const replay = await getApi().submitTurn(id.value, text, key, apply);
    if (replay) {
      live.value = "";
      state.value.turn_index = replay.turn_index;
      state.value.phase = replay.phase;
      state.value.turns_left = replay.turns_left;
      state.value.turns.push({
        index: replay.turn_index + 1,
        speaker: "counterpart",
        text: replay.utterance,
        at: new Date().toISOString(),
      });
      if (replay.deal_proposed) deal.value = replay.deal_proposed;
    } else if (live.value) {
      state.value.turns.push({
        index: state.value.turn_index + 1,
        speaker: "counterpart",
        text: live.value,
        at: new Date().toISOString(),
      });
      live.value = "";
    }
    idempotencyKey.value = crypto.randomUUID();
    if (error.value) {
      state.value.turns = state.value.turns.filter(
        (turn) => turn.text !== text || turn.speaker !== "player",
      );
      draft.value = text;
      idempotencyKey.value = key;
    }
  } catch (caught) {
    state.value.turns = state.value.turns.filter(
      (turn) => !(turn.speaker === "player" && turn.text === text),
    );
    draft.value = text;
    error.value = caught instanceof ApiError ? caught.message : "Ход не отправился";
  } finally {
    thinking.value = false;
    pending.value = false;
    await scrollDown();
  }
}

async function accept() {
  try {
    await getApi().acceptDeal(id.value);
    void trainings.refresh().catch(() => {});
    await router.push({ name: "debrief", params: { id: id.value } });
  } catch (caught) {
    if (caught instanceof ApiError && caught.code === "no_converged_terms") {
      deal.value = null;
      error.value = "Схождения уже нет, продолжайте диалог";
      return;
    }
    error.value = caught instanceof ApiError ? caught.message : "Не удалось принять";
  }
}

async function reject() {
  state.value = await getApi().rejectDeal(id.value);
  deal.value = null;
}

function askToEnd() {
  if (ending.value) return;
  error.value = "";
  endOpen.value = true;
}

function stay() {
  if (ending.value) return;
  endOpen.value = false;
}

async function leave() {
  if (ending.value) return;
  ending.value = true;
  error.value = "";
  try {
    await getApi().walkAway(id.value);
    void trainings.refresh().catch(() => {});
    await router.push({ name: "debrief", params: { id: id.value } });
  } catch (caught) {
    ending.value = false;
    error.value = caught instanceof ApiError ? caught.message : "Не удалось завершить переговоры";
  }
}

function closeWizard() {
  void router.push("/scenarios/pick");
}

function back() {
  closeWizard();
}

function onKey(event: KeyboardEvent) {
  if (event.key === "Escape") stay();
}

// Держим низ ленты на экране: своя реплика, ответ, поток текста и индикатор «пишет…»
watch(
  () => [state.value?.turns.length ?? 0, live.value, thinking.value, deal.value, error.value],
  () => {
    void scrollDown();
  },
);

onMounted(async () => {
  if (typeof ResizeObserver !== "undefined") {
    threadObserver = new ResizeObserver(() => pinToBottom());
    if (scroller.value) threadObserver.observe(scroller.value);
    if (thread.value) threadObserver.observe(thread.value);
  }
  window.addEventListener("resize", pinToBottom);
  window.visualViewport?.addEventListener("resize", pinToBottom);
  window.addEventListener("keydown", onKey);
  try {
    await load();
    await scrollDown();
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : "Не удалось открыть переговоры";
  }
});

onBeforeUnmount(() => {
  threadObserver?.disconnect();
  threadObserver = null;
  window.removeEventListener("resize", pinToBottom);
  window.visualViewport?.removeEventListener("resize", pinToBottom);
  window.removeEventListener("keydown", onKey);
});
</script>

<template>
  <main class="screen chat">
    <header class="header-sticky">
      <div class="pick-header">
        <span class="container">
          <button class="back" type="button" @click="back">
            <img :src="backIcon" alt="" width="20" height="20" />
          </button>

          <img
            v-if="state?.counterpart.persona_id === 'toxic_cpo'"
            class="persona-avatar"
            :src="personaCpo"
            alt=""
            width="50"
            height="50"
          />
          <img
            v-else-if="state?.counterpart.persona_id === 'busy_ceo'"
            class="persona-avatar"
            :src="personaCeo"
            alt=""
            width="50"
            height="50"
          />
          <span v-else class="persona-avatar persona-avatar--empty" aria-hidden="true"></span>

          <b>{{ state?.counterpart.name }}</b>
        </span>
        <button class="back" type="button" aria-label="Закрыть" @click="askToEnd">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M4 4l8 8M12 4l-8 8"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>
    </header>

    <div ref="scroller" class="thread">
      <div ref="thread" class="thread-body">
        <p
          v-for="turn in state?.turns ?? []"
          :key="`${turn.index}-${turn.speaker}`"
          class="bubble"
          :class="turn.speaker"
        >
          {{ turn.text }}
        </p>
        <p v-if="thinking" class="bubble counterpart">
          {{ state?.counterpart.name || "Собеседник" }} пишет…
        </p>
        <p v-if="live" class="bubble counterpart">{{ live }}</p>
      </div>
    </div>

    <article v-if="deal" class="card-stack">
      <b>Условия сошлись</b>
      <p class="muted">{{ deal?.summary }}</p>
      <p v-for="term in deal?.terms" :key="term.type_id">
        {{ term.name }}: {{ term.value }} {{ term.unit }}
      </p>
      <div class="row-stack">
        <button class="btn tg-hide" type="button" style="padding: 0 18px" @click="accept">
          Принять
        </button>
        <button class="btn ghost" type="button" @click="reject">К торгу</button>
      </div>
    </article>

    <p v-if="error" class="error">{{ error }}</p>

    <form class="composer" @submit.prevent="send">
      <input
        v-model="draft"
        :maxlength="state?.limits.max_utterance_chars ?? 1200"
        placeholder="Ваша реплика..."
      />
      <button class="btn tg-hide" type="submit" :disabled="pending">
        <img :src="replayIcon" alt="Отправить" />
      </button>
    </form>

    <div v-if="endOpen" class="sheet-backdrop end-backdrop" @click.self="stay">
      <section class="sheet end-sheet" role="dialog" aria-modal="true" aria-labelledby="end-title">
        <span class="end-handle" aria-hidden="true" />
        <h2 id="end-title">Завершить переговоры</h2>
        <p class="muted">Диалог остановится, и откроется разбор этой тренировки.</p>
        <p v-if="error" class="error">{{ error }}</p>
        <button class="btn tg-hide" type="button" :disabled="ending" @click="leave">
          Завершить
        </button>
        <button class="linkish" type="button" :disabled="ending" @click="stay">
          Продолжить диалог
        </button>
      </section>
    </div>
  </main>
</template>

<style scoped>
.chat {
  position: relative;
  height: 100dvh;
  max-height: 100dvh;
  min-height: 0;
  overflow: hidden;
  padding-bottom: 0;
}

.end-backdrop {
  animation: end-fade 160ms ease;
}

.end-sheet {
  padding: 10px 16px calc(20px + env(safe-area-inset-bottom));
  animation: end-rise 220ms ease;
}

.end-sheet h2,
.end-sheet .muted {
  text-align: center;
}

.end-handle {
  width: 36px;
  height: 4px;
  border-radius: 99px;
  background: #e4e4e7;
  margin: 0 auto 4px;
}

@keyframes end-fade {
  from {
    opacity: 0;
  }
}

@keyframes end-rise {
  from {
    transform: translateY(24px);
  }
}

.thread {
  flex: 1 1 auto;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  overscroll-behavior: contain;
  overflow-anchor: none;
}

.thread-body {
  display: flex;
  flex-direction: column;
  width: 100%;
  margin-top: auto;
}

.composer {
  flex: none;
  position: sticky;
  bottom: 0;
  z-index: 1;
}
</style>
