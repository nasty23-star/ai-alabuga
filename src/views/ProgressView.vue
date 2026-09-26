<script setup lang="ts">
import { useRouter } from 'vue-router'
import chartCard from '@/assets/onboarding/chart-card.svg'
import { GLOSSARY_MVP } from '@/glossary'
import { useTelegramButtons } from '@/telegram'

const router = useRouter()
const metricCount = GLOSSARY_MVP.length

useTelegramButtons(() => ({ main: null, back: null }))
</script>

<template>
  <main class="screen">
    <h1>Прогресс</h1>
    <article class="progress-growth">
      <svg class="progress-chart" width="220" height="64" viewBox="0 0 220 64" fill="none" aria-hidden="true">
        <path d="M6 46C28 44 42 38 62 40C86 42 98 24 124 26C150 28 168 16 214 12" stroke="#b7cdf6" stroke-width="2" stroke-linecap="round" stroke-dasharray="1.5 6" />
      </svg>
      <b>Здесь появится твой рост</b>
      <p class="muted">Нужно два созвона, чтобы увидеть динамику итогового балла.</p>
      <button class="btn progress-start" type="button" @click="router.push('/scenarios/pick')">Начать первое общение</button>
    </article>
    <button class="progress-metrics" type="button" @click="router.push({ name: 'glossary' })">
      <img :src="chartCard" alt="" width="22" height="22" />
      <span>
        <b>{{ metricCount }} метрик</b>
        <span class="muted">Появятся после первого разбора</span>
      </span>
    </button>
  </main>
</template>
