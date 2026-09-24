<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ApiError, getApi } from '@/api'
import type { AgreedTerm, NegotiationState, TurnEvent } from '@/api/types'

const route = useRoute()
const router = useRouter()
const id = computed(() => String(route.params.id))
const state = ref<NegotiationState | null>(null)
const draft = ref('')
const pending = ref(false)
const thinking = ref(false)
const live = ref('')
const error = ref('')
const deal = ref<{ terms: AgreedTerm[]; summary: string } | null>(null)
const idempotencyKey = ref(crypto.randomUUID())
const scroller = ref<HTMLElement | null>(null)

async function load() {
  state.value = await getApi().getNegotiation(id.value)
  deal.value = state.value.pending_deal
  if (state.value.status === 'finished') await router.replace({ name: 'debrief', params: { id: id.value } })
}

function apply(event: TurnEvent) {
  if (!state.value) return
  if (event.event === 'thinking') thinking.value = true
  if (event.event === 'utterance_delta') {
    thinking.value = false
    live.value += event.data.text
  }
  if (event.event === 'turn_committed') {
    state.value.turn_index = event.data.turn_index
    state.value.phase = event.data.phase
    state.value.turns_left = event.data.turns_left
  }
  if (event.event === 'deal_proposed') deal.value = event.data
  if (event.event === 'stream_failed') error.value = event.data.message
  if (event.event === 'counterpart_left' || event.event === 'turn_limit_reached') {
    void router.push({ name: 'debrief', params: { id: id.value } })
  }
}

async function scrollDown() {
  await nextTick()
  scroller.value?.scrollTo({ top: scroller.value.scrollHeight })
}

async function send() {
  const text = draft.value.trim()
  if (!text || !state.value || pending.value) return
  error.value = ''
  pending.value = true
  live.value = ''
  const key = idempotencyKey.value
  state.value.turns.push({ index: state.value.turn_index + 1, speaker: 'player', text, at: new Date().toISOString() })
  draft.value = ''
  try {
    const replay = await getApi().submitTurn(id.value, text, key, apply)
    if (replay) {
      live.value = ''
      state.value.turn_index = replay.turn_index
      state.value.phase = replay.phase
      state.value.turns_left = replay.turns_left
      state.value.turns.push({ index: replay.turn_index + 1, speaker: 'counterpart', text: replay.utterance, at: new Date().toISOString() })
      if (replay.deal_proposed) deal.value = replay.deal_proposed
    } else if (live.value) {
      state.value.turns.push({ index: state.value.turn_index + 1, speaker: 'counterpart', text: live.value, at: new Date().toISOString() })
      live.value = ''
    }
    idempotencyKey.value = crypto.randomUUID()
    if (error.value) {
      state.value.turns = state.value.turns.filter((turn) => turn.text !== text || turn.speaker !== 'player')
      draft.value = text
      idempotencyKey.value = key
    }
  } catch (caught) {
    state.value.turns = state.value.turns.filter((turn) => !(turn.speaker === 'player' && turn.text === text))
    draft.value = text
    error.value = caught instanceof ApiError ? caught.message : 'Ход не отправился'
  } finally {
    thinking.value = false
    pending.value = false
    await scrollDown()
  }
}

async function accept() {
  try {
    await getApi().acceptDeal(id.value)
    await router.push({ name: 'debrief', params: { id: id.value } })
  } catch (caught) {
    if (caught instanceof ApiError && caught.code === 'no_converged_terms') {
      deal.value = null
      error.value = 'Схождения уже нет, продолжайте диалог'
      return
    }
    error.value = caught instanceof ApiError ? caught.message : 'Не удалось принять'
  }
}

async function reject() {
  state.value = await getApi().rejectDeal(id.value)
  deal.value = null
}

async function leave() {
  await getApi().walkAway(id.value)
  await router.push({ name: 'debrief', params: { id: id.value } })
}

onMounted(async () => {
  try {
    await load()
    await scrollDown()
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Не удалось открыть переговоры'
  }
})
</script>

<template>
  <main class="screen" style="padding-bottom: 16px">
    <header class="row" style="justify-content: space-between">
      <div>
        <b>{{ state?.counterpart.name }}</b>
        <p class="muted">{{ state?.scenario.title }} · ходов {{ state?.turns_left ?? '—' }}</p>
      </div>
      <button class="btn ghost" type="button" style="width: auto; color: #dc2626" @click="leave">Уйти</button>
    </header>
    <div ref="scroller" class="stack" style="flex: 1; overflow: auto; min-height: 240px">
      <p v-for="turn in state?.turns ?? []" :key="`${turn.index}-${turn.speaker}`" class="bubble" :class="turn.speaker">{{ turn.text }}</p>
      <p v-if="thinking" class="bubble counterpart">Печатает…</p>
      <p v-if="live" class="bubble counterpart">{{ live }}</p>
    </div>
    <article v-if="deal" class="card stack">
      <b>Условия сошлись</b>
      <p class="muted">{{ deal.summary }}</p>
      <p v-for="term in deal.terms" :key="term.type_id">{{ term.name }}: {{ term.value }} {{ term.unit }}</p>
      <div class="row">
        <button class="btn" type="button" style="width: auto; padding: 0 18px" @click="accept">Принять</button>
        <button class="btn ghost" type="button" @click="reject">К торгу</button>
      </div>
    </article>
    <p v-if="error" class="error">{{ error }}</p>
    <form class="composer" @submit.prevent="send">
      <input v-model="draft" :maxlength="state?.limits.max_utterance_chars ?? 1200" placeholder="Ваша реплика" />
      <button class="btn" type="submit" :disabled="pending">Ход</button>
    </form>
  </main>
</template>
