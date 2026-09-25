<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import backIcon from '@/assets/onboarding/back.svg'
import chevron from '@/assets/onboarding/chevron.svg'
import { ApiError, getApi } from '@/api'
import type { ScenarioTheme } from '@/api/types'
import { useTelegramButtons } from '@/telegram'

const ICONS: Record<string, { bg: string; color: string; svg: string }> = {
  order_placement: {
    bg: '#e8f0ff',
    color: '#1a5cff',
    svg: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="3" width="12" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>',
  },
  contractor_discount: {
    bg: '#fde8ef',
    color: '#e11d48',
    svg: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="7.5" cy="7.5" r="2.2"/><circle cx="16.5" cy="16.5" r="2.2"/><path d="M18 6L6 18"/></svg>',
  },
  salary_raise: {
    bg: '#e7f8ee',
    color: '#16a34a',
    svg: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 16l5-5 4 4 7-8"/><path d="M14 7h6v6"/></svg>',
  },
  contract_renewal: {
    bg: '#fff4d6',
    color: '#d97706',
    svg: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 1 1-2.2-5.5"/><path d="M20 4v5h-5"/></svg>',
  },
  project_budget: {
    bg: '#eee8ff',
    color: '#7c3aed',
    svg: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 19V10M12 19V5M19 19v-7"/></svg>',
  },
}

const BLURBS: Record<string, string> = {
  order_placement: 'Цена и сроки крупного заказа',
  contractor_discount: 'Скидка на новый контракт',
  salary_raise: 'Разговор с руководителем',
  contract_renewal: 'Удержать клиента без лишних уступок',
  project_budget: 'Убедить спонсора добавить бюджет',
}

const router = useRouter()
const themes = ref<ScenarioTheme[]>([])
const error = ref('')

onMounted(async () => {
  try {
    themes.value = (await getApi().scenarios()).themes
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Не удалось загрузить сценарии'
  }
})

function open(theme: ScenarioTheme) {
  const id = theme.variants[0]?.id
  if (id) void router.push(`/wizard/${id}`)
}

useTelegramButtons(() => ({
  main: null,
  back: () => { void router.push('/scenarios') },
}))
</script>

<template>
  <main class="screen">
    <header class="pick-head">
      <button class="back" type="button" @click="router.push('/scenarios')"><img :src="backIcon" alt="" width="20" height="20" /></button>
      <b>Новый созвон</b>
    </header>
    <h1>Выбери сценарий</h1>
    <p v-if="error" class="error">{{ error }}</p>
    <button v-for="theme in themes" :key="theme.theme" class="pick-card" type="button" @click="open(theme)">
      <span class="pick-icon" :style="{ background: ICONS[theme.theme]?.bg ?? '#e8f0ff', color: ICONS[theme.theme]?.color ?? '#1a5cff' }" v-html="ICONS[theme.theme]?.svg ?? ICONS.order_placement.svg" />
      <span class="pick-copy">
        <b>{{ theme.title }}</b>
        <span class="muted">{{ BLURBS[theme.theme] ?? theme.tagline }}</span>
      </span>
      <img :src="chevron" alt="" width="22" height="22" />
    </button>
  </main>
</template>
