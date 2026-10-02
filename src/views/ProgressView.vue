<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import chartCard from "@/assets/onboarding/chart-card.svg";
import chevronLight from "@/assets/onboarding/chevron-light.svg";
import { ApiError } from "@/api";
import { GLOSSARY_MVP } from "@/glossary";
import { useTrainingsStore } from "@/stores/trainings";
import { useTelegramButtons } from "@/telegram";

const router = useRouter();
const trainings = useTrainingsStore();
const metricCount = GLOSSARY_MVP.length;
const error = ref("");

useTelegramButtons(() => ({ main: null, back: null }));

const finished = computed(() => trainings.items.filter((item) => item.status === "finished"));
const scored = computed(() =>
  finished.value
    .filter((item) => typeof item.outcome?.own_outcome === "number")
    .slice()
    .sort(
      (a, b) =>
        new Date(a.finished_at ?? a.started_at).getTime() -
        new Date(b.finished_at ?? b.started_at).getTime(),
    ),
);
const latest = computed(() => scored.value.at(-1)?.outcome?.own_outcome ?? null);
const previous = computed(() => scored.value.at(-2)?.outcome?.own_outcome ?? null);
const average = computed(() => {
  const scores = scored.value
    .map((item) => item.outcome?.own_outcome)
    .filter((value): value is number => typeof value === "number");
  if (!scores.length) return null;
  return Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length);
});
const delta = computed(() =>
  latest.value == null || previous.value == null ? null : latest.value - previous.value,
);
const chart = computed(() => {
  const scores = scored.value
    .map((item) => item.outcome?.own_outcome)
    .filter((value): value is number => typeof value === "number")
    .slice(-8);
  if (scores.length < 2) return "";
  const width = 220;
  const height = 64;
  const pad = 8;
  const min = Math.min(...scores, 0);
  const max = Math.max(...scores, 100);
  const span = max - min || 1;
  return scores
    .map((score, index) => {
      const x = pad + (index / (scores.length - 1)) * (width - pad * 2);
      const y = height - pad - ((score - min) / span) * (height - pad * 2);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
});

onMounted(async () => {
  try {
    await trainings.refresh();
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : "Прогресс недоступен";
  }
});

function deltaLabel(value: number) {
  return value > 0 ? `+${value}` : String(value);
}
</script>

<template>
  <main class="screen">
    <h1>Прогресс</h1>
    <p v-if="error" class="error">{{ error }}</p>
    <article class="progress-growth">
      <svg
        class="progress-chart"
        width="220"
        height="64"
        viewBox="0 0 220 64"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M6 46C28 44 42 38 62 40C86 42 98 24 124 26C150 28 168 16 214 12"
          stroke="#b7cdf6"
          stroke-width="2"
          stroke-linecap="round"
          stroke-dasharray="1.5 6"
        />
      </svg>
      <template v-if="scored.length >= 2 && latest != null">
        <b>Итоговый балл {{ latest }}</b>
        <p class="muted">
          Средний {{ average }} по {{ scored.length }} переговорам<span v-if="delta != null">
            · {{ deltaLabel(delta) }} к прошлому</span
          >
        </p>
      </template>
      <template v-else-if="finished.length">
        <b>{{ latest != null ? `Первый балл — ${latest}` : "Первые переговоры уже есть" }}</b>
        <p class="muted">Нужно два диалога с итоговым баллом, чтобы увидеть динамику.</p>
      </template>
      <template v-else>
        <b>Здесь появится твой рост</b>
        <p class="muted">Нужно два диалога, чтобы увидеть динамику итогового балла.</p>
        <button class="btn progress-start" type="button" @click="router.push('/scenarios/pick')">
          Начать первые переговоры
        </button>
      </template>
    </article>
    <button class="progress-metrics" type="button" @click="router.push({ name: 'glossary' })">
      <img :src="chartCard" alt="" width="22" height="22" />
      <span>
        <b>{{ metricCount }} метрик</b>
        <span class="muted">{{
          finished.length ? "Уже можно смотреть в разборе" : "Появятся после первого разбора"
        }}</span>
      </span>
    </button>
    <button class="btn home-call profile-badges" type="button" @click="router.push('/peaks')">
      <span>Мои вершины</span>
      <img :src="chevronLight" alt="" width="20" height="22" />
    </button>
  </main>
</template>
