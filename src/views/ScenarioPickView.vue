<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import backIcon from '@/assets/onboarding/back.svg'
import chevron from '@/assets/onboarding/chevron.svg'
import { ApiError, getApi } from '@/api'
import type { ScenarioTheme } from '@/api/types'
import { scenarioIcon } from '@/scenarioIcons'
import { scenarioVariant } from '@/scenarios'
import { useSessionStore } from '@/stores/session'
import { useTelegramButtons } from '@/telegram'

const BLURBS: Record<string, string> = {
  order_placement: 'Цена и сроки крупного заказа',
  contractor_discount: 'Скидка на новый контракт',
  salary_raise: 'Разговор с руководителем',
  contract_renewal: 'Удержать клиента без лишних уступок',
  project_budget: 'Убедить спонсора добавить бюджет',
}

const router = useRouter()
const session = useSessionStore()
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
  const id = scenarioVariant(theme, session.account?.spheres ?? [])?.id
  if (id) void router.push(`/wizard/${id}`)
}

useTelegramButtons(() => ({
  main: null,
  back: () => { void router.push('/scenarios') },
}))
</script>

<template>
  <main class="screen scenario">
    <header class="pick-head">
      <button class="back" type="button" @click="router.push('/scenarios')"><img :src="backIcon" alt="" width="20" height="20" /></button>
      <b>Новое общение</b>
    </header>
    <h1>Выбери сценарий</h1>
    <p v-if="error" class="error">{{ error }}</p>
    <button v-for="theme in themes" :key="theme.theme" class="pick-card" type="button" @click="open(theme)">
      <span class="pick-icon" :style="{ background: scenarioIcon(theme.theme).bg, color: scenarioIcon(theme.theme).color }" v-html="scenarioIcon(theme.theme).svg" />
      <span class="pick-copy">
        <b>{{ theme.title }}</b>
        <span class="muted">{{theme.tagline }}</span>
      </span>
      <img :src="chevron" alt="" width="22" height="22" />
    </button>
  </main>
</template>
