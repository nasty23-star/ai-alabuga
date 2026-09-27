<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import backIcon from '@/assets/onboarding/back.svg'
import logo from '@/assets/onboarding/logo.svg'
import peaksArt from '@/assets/onboarding/peaks.svg'
import { ApiError, getApi } from '@/api'
import type { NegotiationListItem } from '@/api/types'
import { collectPeaks } from '@/gamification/badges'
import { useGamificationStore } from '@/stores/gamification'
import { useSessionStore } from '@/stores/session'
import { useTelegramButtons } from '@/telegram'

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']

const router = useRouter()
const session = useSessionStore()
const gamification = useGamificationStore()
const items = ref<NegotiationListItem[]>([])
const error = ref('')
const shared = ref(false)

const now = new Date()
const monthLabel = `Итоги ${MONTHS[now.getMonth()]}`
const name = computed(() => session.account?.display_name?.trim() || 'Мистер X')
const initial = computed(() => name.value.slice(0, 1).toUpperCase())

const earned = computed(() => collectPeaks(items.value).filter((peak) => peak.earned).length)
const streak = computed(() => streakDays(items.value))
const badgeLine = computed(() => `${ru(earned.value, 'бейдж', 'бейджа', 'бейджей')} · серия ${ru(streak.value, 'день', 'дня', 'дней')}`)

const currentKey = monthKey(now)
const thisMonth = computed(() => finishedInMonth(items.value, currentKey))
const calls = computed(() => thisMonth.value.length)
const score = computed(() => averageScore(thisMonth.value))
const delta = computed(() => {
  const current = score.value
  const previous = averageScore(finishedInMonth(items.value, currentKey - 1))
  if (current == null || previous == null) return null
  return current - previous
})

useTelegramButtons(() => ({
  main: null,
  back: () => { void router.push({ name: 'settings' }) },
}))

onMounted(async () => {
  gamification.hydrate()
  try {
    items.value = await loadAll()
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Итоги недоступны'
  }
})

async function loadAll() {
  const all: NegotiationListItem[] = []
  let cursor: string | null = null
  for (let page = 0; page < 20; page += 1) {
    const result = await getApi().listNegotiations(50, cursor)
    all.push(...result.items)
    if (!result.next_cursor) break
    cursor = result.next_cursor
  }
  return all
}

function monthKey(date: Date) {
  return date.getFullYear() * 12 + date.getMonth()
}

function itemDate(item: NegotiationListItem) {
  const date = new Date(item.finished_at ?? item.started_at)
  return Number.isNaN(date.getTime()) ? null : date
}

function finishedInMonth(list: NegotiationListItem[], key: number) {
  return list.filter((item) => {
    if (item.status !== 'finished') return false
    const date = itemDate(item)
    return date != null && monthKey(date) === key
  })
}

function averageScore(list: NegotiationListItem[]) {
  const scores = list.map((item) => item.outcome?.own_outcome).filter((value): value is number => typeof value === 'number')
  if (!scores.length) return null
  return Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length)
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

function streakDays(list: NegotiationListItem[]) {
  const days = new Set<string>()
  for (const item of list) {
    if (item.status !== 'finished') continue
    const date = itemDate(item)
    if (date) days.add(dayKey(date))
  }
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1)
  let count = 0
  while (days.has(dayKey(cursor))) {
    count += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return count
}

function ru(value: number, one: string, few: string, many: string) {
  const mod10 = value % 10
  const mod100 = value % 100
  const word = mod10 === 1 && mod100 !== 11 ? one : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? few : many
  return `${value} ${word}`
}

function deltaLabel(value: number) {
  if (value > 0) return `+${value}`
  return String(value)
}

function copyText(text: string) {
  const area = document.createElement('textarea')
  area.value = text
  area.setAttribute('readonly', '')
  area.style.position = 'fixed'
  area.style.left = '-9999px'
  document.body.appendChild(area)
  area.select()
  const ok = document.execCommand('copy')
  area.remove()
  return ok
}

async function share() {
  error.value = ''
  const scoreText = score.value == null ? '—' : String(score.value)
  const text = `${name.value} — ${monthLabel.toLowerCase()}: ${calls.value} созвонов, итоговый балл ${scoreText}`
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Ты взял эту вершину', text })
      return
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') return
    }
  }
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    if (!copyText(text)) {
      error.value = 'Не удалось поделиться'
      return
    }
  }
  shared.value = true
  window.setTimeout(() => { shared.value = false }, 1600)
}
</script>

<template>
  <main class="screen bare summit">
    <header class="summit-top">
      <button class="back" type="button" aria-label="Назад" @click="router.push({ name: 'settings' })">
        <img :src="backIcon" alt="" width="20" height="20" />
      </button>
      <span class="summit-month">{{ monthLabel }}</span>
      <img :src="logo" alt="Вершина" height="22" />
    </header>

    <div class="summit-user">
      <!-- <span class="summit-avatar" aria-hidden="true">{{ initial }}</span> -->
      <span>
        <b>{{ name }}</b>
        <span v-if="gamification.active" class="muted">{{ badgeLine }}</span>
      </span>
    </div>

    <h1>Ты взял эту вершину</h1>

    <div class="summit-stats">
      <article class="summit-stat">
        <span>Созвонов</span>
        <b>{{ calls }}</b>
      </article>
      <article class="summit-stat">
        <span>Итоговый балл</span>
        <p class="summit-score">
          <b>{{ score ?? '—' }}</b>
          <em v-if="delta != null" :class="{ up: delta > 0, down: delta < 0 }">{{ deltaLabel(delta) }}</em>
        </p>
      </article>
    </div>

    <div class="summit-art">
      <img :src="peaksArt" alt="" />
    </div>

    <button class="btn summit-share btn-cta" type="button" @click="share">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <path d="M9 11.5V3.5M9 3.5 6.2 6.2M9 3.5l2.8 2.7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M4 9.5v4.2A1.3 1.3 0 0 0 5.3 15h7.4A1.3 1.3 0 0 0 14 13.7V9.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
      </svg>
      {{ shared ? 'Скопировано' : 'Поделиться' }}
    </button>
    <p v-if="error" class="error">{{ error }}</p>
  </main>
</template>
