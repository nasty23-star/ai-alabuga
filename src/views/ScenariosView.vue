<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import badgeIcon from '@/assets/onboarding/badge.svg'
import chartCard from '@/assets/onboarding/chart-card.svg'
import chevron from '@/assets/onboarding/chevron.svg'
import chevronLight from '@/assets/onboarding/chevron-light.svg'
import flame from '@/assets/onboarding/flame.svg'
import mic from '@/assets/onboarding/mic.svg'
import logo from '@/assets/onboarding/logo.svg'
import { ApiError, getApi } from '@/api'
import type { NegotiationListItem } from '@/api/types'
import BadgeRow from '@/components/BadgeRow.vue'
import { collectBadges, collectPeaks } from '@/gamification/badges'
import { useGamificationStore } from '@/stores/gamification'
import { useSessionStore } from '@/stores/session'
import { useTelegramButtons } from '@/telegram'

const router = useRouter()

useTelegramButtons(() => ({
  main: { text: 'Новый созвон', onClick: () => { void router.push('/scenarios/pick') } },
  back: null,
}))
const session = useSessionStore()
const gamification = useGamificationStore()
const history = ref<NegotiationListItem[]>([])
const error = ref('')
const badges = computed(() => collectBadges(history.value))
const peaks = computed(() => collectPeaks(history.value))
const earned = computed(() => peaks.value.filter((item) => item.earned).length)
const initial = computed(() => (session.account?.display_name?.trim()?.[0] ?? 'Я').toUpperCase())

onMounted(async () => {
  gamification.hydrate()
  try {
    if (gamification.active) history.value = (await getApi().listNegotiations(20, null)).items
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Не удалось загрузить сценарии'
  }
})

async function openReview() {
  error.value = ''
  try {
    const page = await getApi().listNegotiations(20, null)
    const finished = page.items.find((item) => item.status === 'finished')
    if (!finished) {
      error.value = 'Разбор появится после первых переговоров'
      return
    }
    await router.push({ name: 'debrief', params: { id: finished.id }, query: { link: '1' } })
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Не удалось открыть разбор'
  }
}
</script>

<template>
  <main class="screen" style="background: linear-gradient(180deg, #d4e2fd 0%, #ecf1fc 31%, #f5f7fc 62%)">
    <header class="row" style="justify-content: space-between">
      <img :src="logo" alt="Вершина" height="22" />
    </header>
    <h1 style="font-size: 26px; letter-spacing: -0.78px">Привет, {{ session.account?.display_name || 'Мистер X' }}!</h1>
    <p class="body">Начнём первое восхождение</p>
    <div v-if="gamification.active" class="row">
      <span class="pill" style="color: #ea580c"><img :src="flame" alt="" width="16" height="16" /> {{ earned }} дней</span>
      <button class="pill" type="button" style="color: #3160f4" @click="router.push('/peaks')"><img :src="badgeIcon" alt="" width="16" height="16" /> {{ earned }} бейджей</button>
    </div>
    <BadgeRow v-if="gamification.active" :badges="badges" />
    <button class="btn home-call tg-hide" type="button" @click="router.push('/scenarios/pick')">
      <img :src="mic" alt="" width="22" height="22" />
      <span>Новый созвон</span>
      <img :src="chevronLight" alt="" width="20" height="22" />
    </button>
    <button class="home-own" type="button" @click="router.push({ path: '/wizard', query: { persona: 'custom' } })">
      <span class="home-own-icon" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 3.5v11M3.5 9h11" stroke="#fff" stroke-width="1.8" stroke-linecap="round" /></svg>
      </span>
      <span class="pick-copy">
        <b>Свой собеседник</b>
        <span class="muted">Копия реального человека из Cognico или вручную</span>
      </span>
      <img :src="chevron" alt="" width="20" height="22" />
    </button>
    <p v-if="error" class="error">{{ error }}</p>
    <button class="card row" type="button" @click="openReview">
      <img :src="chartCard" alt="" width="22" height="22" />
      <span><b>Здесь будет твой разбор</b><span class="muted" style="display: block">Появится после первого созвона</span></span>
    </button>
  </main>
</template>
