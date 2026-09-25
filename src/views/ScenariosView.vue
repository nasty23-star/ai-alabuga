<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import badgeIcon from '@/assets/onboarding/badge.svg'
import chartCard from '@/assets/onboarding/chart-card.svg'
import flame from '@/assets/onboarding/flame.svg'
import wordmark from '@/assets/onboarding/wordmark.svg'
import { ApiError, getApi } from '@/api'
import type { NegotiationListItem, ScenariosResponse } from '@/api/types'
import BadgeRow from '@/components/BadgeRow.vue'
import { collectBadges } from '@/gamification/badges'
import { useGamificationStore } from '@/stores/gamification'
import { useSessionStore } from '@/stores/session'
import { useTelegramButtons } from '@/telegram'

const router = useRouter()

useTelegramButtons(() => ({
  main: { text: 'Новые переговоры', onClick: () => { void router.push('/scenarios/pick') } },
  back: null,
}))
const session = useSessionStore()
const gamification = useGamificationStore()
const data = ref<ScenariosResponse | null>(null)
const history = ref<NegotiationListItem[]>([])
const error = ref('')
const badges = computed(() => collectBadges(history.value))
const earned = computed(() => badges.value.filter((item) => item.earned).length)

onMounted(async () => {
  gamification.hydrate()
  try {
    data.value = await getApi().scenarios()
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
      <img :src="wordmark" alt="Вершина" height="22" />
    </header>
    <h1 style="font-size: 26px; letter-spacing: -0.78px">Привет, {{ session.account?.display_name || 'Мистер X' }}!</h1>
    <p class="body">Начнём первое восхождение</p>
    <div v-if="gamification.active" class="row">
      <span class="pill" style="color: #ea580c"><img :src="flame" alt="" width="16" height="16" /> {{ earned }} дней</span>
      <span class="pill" style="color: #3160f4"><img :src="badgeIcon" alt="" width="16" height="16" /> {{ earned }} бейджей</span>
    </div>
    <BadgeRow v-if="gamification.active" :badges="badges" />
    <button class="btn tg-hide" type="button" @click="router.push('/scenarios/pick')">Новые переговоры</button>
    <p v-if="error" class="error">{{ error }}</p>
    <article v-for="theme in data?.themes ?? []" :key="theme.theme" class="card" style="display: flex; flex-direction: column; gap: 8px">
      <b>{{ theme.title }}</b>
      <p class="muted">{{ theme.tagline }}</p>
      <button v-for="variant in theme.variants" :key="variant.id" class="btn ghost" type="button" style="text-align: left; color: #1a5cff" @click="router.push(`/wizard/${variant.id}`)">{{ variant.seat }}</button>
    </article>
    <button class="card row" type="button" @click="openReview">
      <img :src="chartCard" alt="" width="22" height="22" />
      <span><b>Здесь будет твой разбор</b><span class="muted" style="display: block">Появится после первых переговоров</span></span>
    </button>
  </main>
</template>
