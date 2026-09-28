<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import chevron from '@/assets/onboarding/chevron.svg'
import chevronLight from '@/assets/onboarding/chevron-light.svg'
import micLime from '@/assets/onboarding/mic-lime.svg'
import mountains from '@/assets/onboarding/mountains.png'
import { ApiError, getApi } from '@/api'
import type { NegotiationListItem, NegotiationStatus } from '@/api/types'
import { scenarioIcon } from '@/scenarioIcons'
import { useTelegramButtons } from '@/telegram'

const THEME_BY_TITLE: Record<string, string> = {
  'Размещение заказа': 'order_placement',
  'Скидка у подрядчика': 'contractor_discount',
  'Повышение зарплаты': 'salary_raise',
  'Продление контракта': 'contract_renewal',
  'Бюджет проекта': 'project_budget',
}

const router = useRouter()
const items = ref<NegotiationListItem[]>([])
const cursor = ref<string | null>(null)
const error = ref('')
const loading = ref(true)

useTelegramButtons(() => ({ main: null, back: null }))

async function loadMore() {
  const page = await getApi().listNegotiations(20, cursor.value)
  items.value.push(...page.items)
  cursor.value = page.next_cursor
}

onMounted(async () => {
  try {
    await loadMore()
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'История недоступна'
  } finally {
    loading.value = false
  }
})

function open(item: NegotiationListItem) {
  if (item.status === 'finished') void router.push({ name: 'debrief', params: { id: item.id } })
  else if (item.status === 'active') void router.push({ name: 'chat', params: { id: item.id } })
}

function iconOf(item: NegotiationListItem) {
  return scenarioIcon(THEME_BY_TITLE[item.theme_title])
}

function when(item: NegotiationListItem) {
  const date = new Date(item.finished_at ?? item.started_at)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(date).replace('.', '')
}

function statusLabel(status: NegotiationStatus) {
  if (status === 'active') return 'В процессе'
  if (status === 'interrupted') return 'Прерваны'
  return 'Без сделки'
}

function scoreOf(item: NegotiationListItem) {
  const score = item.outcome?.own_outcome
  return typeof score === 'number' ? score : null
}
</script>

<template>
  <main class="screen trainings">
    <h1>Мои тренировки</h1>
    <button class="btn home-call is-primary tg-hide" type="button" @click="router.push('/scenarios/pick')">
      <span class="home-call-mic" aria-hidden="true"><img :src="micLime" alt="" width="21" height="21" /></span>
      <span class="home-call-label">Новый созвон<br>(пока текстом)</span>
      <img class="home-call-chevron" :src="chevronLight" alt="" width="20" height="22" />
    </button>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="loading" class="muted">Загружаем тренировки…</p>
    <article v-else-if="!items.length && !error" class="train-empty">
      <img :src="mountains" alt="" />
      <b>Здесь будет история тренировок</b>
      <p class="muted">После каждого созвона — итоговый балл и разбор. Первый займёт около 10 минут.</p>
    </article>
    <div v-else class="train-list">
      <button v-for="item in items" :key="item.id" class="train-row" type="button" @click="open(item)">
        <span class="pick-icon" :style="{ background: iconOf(item).bg, color: iconOf(item).color }" v-html="iconOf(item).svg" />
        <span class="pick-copy">
          <b>{{ item.theme_title }}</b>
          <span class="muted">{{ item.counterpart.name }} · {{ when(item) }}</span>
        </span>
        <b v-if="scoreOf(item) != null" class="train-score" :class="{ good: (scoreOf(item) ?? 0) >= 70 }">{{ scoreOf(item) }}</b>
        <span v-else class="train-note">{{ statusLabel(item.status) }}</span>
        <img v-if="item.status !== 'interrupted'" :src="chevron" alt="" width="20" height="22" />
      </button>
      <button v-if="cursor" class="btn ghost" type="button" @click="loadMore">Ещё</button>
    </div>
  </main>
</template>
