<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import backIcon from '@/assets/onboarding/back.svg'
import peaksArt from '@/assets/onboarding/peaks.svg'
import { ApiError, getApi } from '@/api'
import { useTelegramButtons } from '@/telegram'
import type { Debrief, Metric, NegotiationState } from '@/api/types'

interface ShareItem {
  id: string
  url: string
  expiresAt: string
  revoked: boolean
}

const COPY: Record<string, { en: string; text: string }> = {
  filler_density: {
    en: 'Filler Density',
    text: 'Как часто в репликах звучат слова-паразиты. Чем меньше, тем чище речь.',
  },
  open_question_ratio: {
    en: 'Open Question Ratio',
    text: 'Доля открытых вопросов — «почему», «как», «что для вас важно» — среди всех твоих вопросов. Открытые выясняют интересы собеседника, закрытые («вы согласны?») — нет.',
  },
  concession_discipline: {
    en: 'Concession Discipline',
    text: 'Доля уступок, сделанных в обмен на что-то. 100% — ни одной уступки просто так.',
  },
  own_outcome: {
    en: 'Own Outcome',
    text: 'Насколько итог хорош по твоим приоритетам из мастера: 0 — твоя граница, 100 — идеал.',
  },
  batna_gain: {
    en: 'BATNA Gain',
    text: 'Насколько сделка лучше плана Б. Минус — лучше было не договариваться. Только если план Б задан числом.',
  },
  reservation_point_discipline: {
    en: 'Reservation Point Discipline',
    text: 'Не согласился ли ты на условия хуже своей границы: да или нет.',
  },
}

interface GlossaryEntry {
  title: string
  en: string
  text: string
}

const GLOSSARY_MVP: GlossaryEntry[] = [
  {
    title: 'Слова-паразиты',
    en: 'Filler Density',
    text: 'Доля «ну», «как бы», «типа», «короче», «в общем» среди всех твоих слов',
  },
  {
    title: 'Вопросы, чтобы получить информацию',
    en: 'Open Question Ratio',
    text: 'Доля открытых вопросов («почему», «как», «что для вас важно») среди всех твоих вопросов',
  },
  {
    title: 'Уступки собеседнику',
    en: 'Concession Discipline',
    text: 'Доля уступок, сделанных в обмен на что-то. 100% — ни одной уступки просто так',
  },
  {
    title: 'Выгодность сделки',
    en: 'Own Outcome',
    text: 'Насколько итог хорош по твоим приоритетам из мастера: 0 — твоя граница, 100 — идеал',
  },
  {
    title: 'Выгодность альтернативной сделки',
    en: 'BATNA Gain',
    text: 'Насколько сделка лучше плана Б. Минус — лучше было не договариваться. Только если план Б задан числом',
  },
  {
    title: 'Реакция на возражения',
    en: 'Objection Recognition',
    text: 'Доля возражений собеседника, на которые ты отреагировал, а не пропустил',
  },
  {
    title: 'Согласие на невыгодные условия',
    en: 'Reservation Point Discipline',
    text: 'Не согласился ли ты на условия хуже своей границы: да или нет',
  },
  {
    title: 'Выясненные неизвестные факты',
    en: 'Information Gathering',
    text: 'Доля скрытых фактов сценария, которые ты выяснил',
  },
  {
    title: 'Аргументы',
    en: 'Objective Criteria',
    text: 'Опирался ли на рыночную цену, регламент, прецедент — вместо «я так хочу»',
  },
]

const GLOSSARY_DERIVED: { title: string; text: string }[] = [
  { title: 'Итоговый балл', text: 'взвешенное среднее числовых метрик. Веса задаются в таблице порогов.' },
  { title: 'Топ-3 зоны роста', text: 'три метрики, сильнее всего отстающие от порога. С них начинается разбор.' },
]

const GLOSSARY_PLANNED: { title: string; en: string }[] = [
  { title: 'Баланс речи', en: 'Talk/Listen Ratio' },
  { title: 'Самый длинный монолог', en: 'Longest Monologue' },
  { title: 'Скорость ответа', en: 'Response Latency' },
]

const route = useRoute()
const router = useRouter()
const id = computed(() => String(route.params.id))
const debrief = ref<Debrief | null>(null)
const negotiation = ref<NegotiationState | null>(null)
const error = ref('')
const step = ref<'score' | 'feedback' | 'summary' | 'metric' | 'glossary' | 'links'>('score')
const scales = [
  { id: 'value', title: 'Насколько итог выгоден для тебя?' },
  { id: 'confident', title: 'Насколько уверенно ты себя чувствовал?' },
  { id: 'priorities', title: 'Достигнуто ли согласие по своим приоритетам?' },
  { id: 'liked', title: 'Тебе это понравилось?' },
  { id: 'honest', title: 'Насколько честным был разговор?' },
  { id: 'again', title: 'Хочешь работать с этим человеком ещё?' },
]
const marks = ref<Record<string, number>>({})
const otherwise = ref('')
const nextAsk = ref('')
const selectedKey = ref('')
const sheet = ref(false)
const rateSheet = ref(false)
const glossaryQuery = ref('')
const includeTranscript = ref(false)
const ttlHours = ref(24)
const pending = ref(false)
const copied = ref(false)
const links = ref<ShareItem[]>([])
const reviewTab = ref<'deal' | 'growth'>('deal')

const DEAL_KEYS = new Set(['own_outcome', 'batna_gain', 'reservation_point_discipline', 'concession_discipline'])

function glossaryHit(parts: Array<string | undefined>, query: string) {
  return parts.some((part) => part?.toLowerCase().includes(query))
}

const glossaryMvp = computed(() => {
  const query = glossaryQuery.value.trim().toLowerCase()
  if (!query || 'считаем в mvp'.includes(query)) return GLOSSARY_MVP
  return GLOSSARY_MVP.filter((item) => glossaryHit([item.title, item.en, item.text], query))
})

const glossaryDerived = computed(() => {
  const query = glossaryQuery.value.trim().toLowerCase()
  if (!query || 'производные'.includes(query)) return GLOSSARY_DERIVED
  return GLOSSARY_DERIVED.filter((item) => glossaryHit([item.title, item.text], query))
})

const glossaryPlanned = computed(() => {
  const query = glossaryQuery.value.trim().toLowerCase()
  if (!query || 'в разработке'.includes(query)) return GLOSSARY_PLANNED
  return GLOSSARY_PLANNED.filter((item) => glossaryHit([item.title, item.en], query))
})

const glossaryEmpty = computed(() => !glossaryMvp.value.length && !glossaryDerived.value.length && !glossaryPlanned.value.length)

const selected = computed(() => debrief.value?.metrics.find((metric) => metric.key === selectedKey.value) ?? null)
const score = computed(() => {
  const own = debrief.value?.outcome.own_outcome
  if (own != null) return Math.round(own)
  const numbers = (debrief.value?.metrics ?? []).filter((metric) => metric.available && metric.unit !== 'count' && typeof metric.value === 'number')
  if (!numbers.length) return null
  const total = numbers.reduce((sum, metric) => sum + Number(metric.value), 0)
  return Math.round(total / numbers.length)
})

const outcomeLabel = computed(() => {
  const type = debrief.value?.outcome.type
  if (type === 'deal') return 'Сделка'
  if (type === 'partial_deal') return 'Частичная сделка'
  return 'Без сделки'
})

const outcomeShort = computed(() => {
  const type = debrief.value?.outcome.type
  if (type === 'deal') return 'сделка'
  if (type === 'partial_deal') return 'частичная'
  return 'без сделки'
})

const dealMetrics = computed(() => (debrief.value?.metrics ?? []).filter((metric) => DEAL_KEYS.has(metric.key)))
const growthMetrics = computed(() => (debrief.value?.metrics ?? []).filter((metric) => !DEAL_KEYS.has(metric.key)))
const startHere = computed(() => {
  const areas = new Set(debrief.value?.growth_areas ?? [])
  const picked = (debrief.value?.metrics ?? []).filter((metric) => areas.has(metric.key))
  return (picked.length ? picked : growthMetrics.value).slice(0, 3)
})

onMounted(async () => {
  try {
    const [report, state] = await Promise.all([getApi().debrief(id.value), getApi().getNegotiation(id.value)])
    debrief.value = report
    negotiation.value = state
    if (route.query.link === '1') {
      step.value = 'links'
      await ensureLink()
    }
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Разбор недоступен'
  }
})

function formatMetric(metric: Metric) {
  if (!metric.available) return metric.unavailable_reason ?? '—'
  if (metric.unit === 'boolean') return metric.value ? 'Да' : 'Нет'
  if (metric.unit === 'percent') return `${metric.value}%`
  return String(metric.value ?? '—')
}

function ratio(metric: Metric) {
  if (!metric.available) return 0
  if (typeof metric.value === 'boolean') return metric.value ? 100 : 8
  if (typeof metric.value !== 'number') return 0
  if (metric.unit === 'count') return Math.max(0, Math.min(100, 100 - metric.value * 12))
  return Math.max(0, Math.min(100, metric.value))
}

function openMetric(key: string) {
  selectedKey.value = key
  step.value = 'metric'
}

function absoluteUrl(url: string) {
  if (url.startsWith('http')) return url
  const path = url.startsWith('/') ? url : `/${url}`
  return `${location.origin}${import.meta.env.BASE_URL}#${path}`
}

function linkState(item: ShareItem) {
  if (item.revoked) return 'отозвана'
  if (new Date(item.expiresAt).getTime() < Date.now()) return 'срок истёк'
  return 'активна'
}

async function ensureLink() {
  if (links.value[0] && !links.value[0].revoked) return links.value[0]
  error.value = ''
  pending.value = true
  try {
    const created = await getApi().share(id.value, ttlHours.value, includeTranscript.value)
    const item: ShareItem = { id: created.id, url: created.url, expiresAt: created.expires_at, revoked: false }
    links.value.unshift(item)
    copied.value = false
    return item
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Не удалось открыть ссылку'
    return null
  } finally {
    pending.value = false
  }
}

async function copyLink() {
  const created = await ensureLink()
  if (!created) return
  try {
    await navigator.clipboard.writeText(absoluteUrl(created.url))
    copied.value = true
  } catch {
    error.value = 'Ссылка создана. Скопируйте её из списка «Мои ссылки».'
  }
}

async function sendTelegram() {
  const created = await ensureLink()
  if (!created) return
  const share = `https://t.me/share/url?url=${encodeURIComponent(absoluteUrl(created.url))}&text=${encodeURIComponent('Разбор переговоров')}`
  const app = window.Telegram?.WebApp
  if (app?.openTelegramLink) app.openTelegramLink(share)
  else window.open(share, '_blank', 'noopener')
}

async function revoke(item: ShareItem) {
  await getApi().revokeShare(item.id)
  item.revoked = true
}

function again() {
  const scenarioId = negotiation.value?.scenario.id
  void router.push(scenarioId ? `/wizard/${scenarioId}` : '/wizard')
}

useTelegramButtons(() => {
  if (sheet.value) {
    return {
      main: { text: 'Отправить в Telegram', enabled: !pending.value, progress: pending.value, onClick: () => { void sendTelegram() } },
      back: () => { sheet.value = false },
    }
  }
  if (step.value === 'glossary') {
    return { main: null, back: () => { step.value = 'summary' } }
  }
  if (step.value === 'metric') {
    return { main: { text: 'Все метрики', onClick: () => { step.value = 'summary' } }, back: () => { step.value = 'summary' } }
  }
  if (step.value === 'score') {
    if (rateSheet.value) {
      return {
        main: { text: 'Да, оценить', onClick: () => { rateSheet.value = false; step.value = 'feedback' } },
        back: () => { rateSheet.value = false },
      }
    }
    return {
      main: { text: 'Смотреть разбор', onClick: () => { rateSheet.value = true } },
      back: () => { void router.push('/scenarios') },
    }
  }
  if (step.value === 'feedback') {
    return { main: { text: 'К разбору', onClick: () => { step.value = 'summary' } }, back: () => { void router.push('/scenarios') } }
  }
  if (step.value === 'links') {
    return {
      main: null,
      back: () => {
        if (route.query.link === '1') void router.push('/scenarios')
        else { sheet.value = true; step.value = 'summary' }
      },
    }
  }
  return { main: { text: 'Новое общение', onClick: again }, back: () => { void router.push('/scenarios') } }
})
</script>

<template>
  <main class="screen debrief" :class="{ 'score-screen': step === 'score' }">
    <p v-if="error" class="error">{{ error }}</p>

    <template v-if="debrief && step === 'score'">
      <header class="score-head">
        <button class="back" type="button" aria-label="Закрыть" @click="router.push('/scenarios')">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
        </button>
      </header>
      <div class="score-hero">
        <span class="score-pill" :class="debrief.outcome.type">{{ outcomeLabel }}</span>
        <b>{{ score ?? '—' }}</b>
        <span>итоговый балл</span>
      </div>
      <div class="score-art">
        <img :src="peaksArt" alt="" />
      </div>
      <button class="btn" type="button" @click="rateSheet = true">Смотреть разбор</button>
      <div v-if="rateSheet" class="sheet-backdrop" @click.self="rateSheet = false">
        <section class="sheet">
          <h2>Оценишь ценность сделки?</h2>
          <p class="muted">7 коротких вопросов, около минуты. Руководитель увидит не только цифры, но и как прошли переговоры</p>
          <button class="btn" type="button" @click="rateSheet = false; step = 'feedback'">Да, оценить</button>
          <button class="btn ghost" type="button" @click="rateSheet = false; step = 'summary'">Нет, сразу к разбору</button>
        </section>
      </div>
    </template>

    <template v-else-if="debrief && step === 'feedback'">
      <h1>Как прошли переговоры?</h1>
      <article v-for="item in scales" :key="item.id" class="card reflect">
        <p>{{ item.title }}</p>
        <div class="scale">
          <button
            v-for="mark in 7"
            :key="mark"
            type="button"
            :class="{ on: marks[item.id] === mark }"
            @click="marks[item.id] = mark"
          >{{ mark }}</button>
        </div>
      </article>
      <label class="card reflect">
        <span>Что бы сделал иначе?</span>
        <textarea v-model="otherwise" rows="3" placeholder="Например, раньше спросил бы про сроки" />
      </label>
      <label class="card reflect">
        <span>Что спросить в следующий раз?</span>
        <textarea v-model="nextAsk" rows="3" placeholder="Раньше спросил бы про сроки" />
      </label>
      <button class="btn tg-hide" type="button" @click="step = 'summary'">К разбору</button>
    </template>

    <template v-else-if="debrief && step === 'summary'">
      <header class="pick-head">
        <button class="back" type="button" @click="router.push('/scenarios')"><img :src="backIcon" alt="" width="20" height="20" /></button>
        <b>Разбор</b>
        <button class="back" type="button" aria-label="Поделиться" @click="sheet = true">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><circle cx="5" cy="9" r="2" stroke="currentColor" stroke-width="1.5"/><circle cx="13" cy="5" r="2" stroke="currentColor" stroke-width="1.5"/><circle cx="13" cy="13" r="2" stroke="currentColor" stroke-width="1.5"/><path d="M7 8.2l4-2.4M7 9.8l4 2.4" stroke="currentColor" stroke-width="1.5"/></svg>
        </button>
      </header>
      <h1>{{ negotiation?.scenario.title ?? 'Разбор' }}</h1>
      <p v-if="negotiation?.counterpart.name" class="muted">{{ negotiation.counterpart.name }}</p>
      <section class="score-card score-row">
        <b>{{ score ?? '—' }}</b>
        <span>Итоговый балл<span class="muted">взвешенное среднее</span></span>
        <em class="score-pill" :class="debrief.outcome.type">{{ outcomeShort }}</em>
      </section>
      <section v-if="startHere.length" class="card start-here">
        <header><b>С чего начать</b><span class="muted">топ-{{ startHere.length }}</span></header>
        <button v-for="(metric, index) in startHere" :key="metric.key" type="button" @click="openMetric(metric.key)">
          <i>{{ index + 1 }}</i>
          <span>{{ metric.title }}</span>
          <b>{{ metric.available ? formatMetric(metric) : '—' }}</b>
        </button>
      </section>
      <div class="review-tabs" role="tablist">
        <button type="button" role="tab" :aria-selected="reviewTab === 'deal'" :class="{ on: reviewTab === 'deal' }" @click="reviewTab = 'deal'">Итог сделки</button>
        <button type="button" role="tab" :aria-selected="reviewTab === 'growth'" :class="{ on: reviewTab === 'growth' }" @click="reviewTab = 'growth'">Мой рост</button>
      </div>
      <div v-if="reviewTab === 'deal'" class="metrics">
        <button v-for="metric in dealMetrics" :key="metric.key" class="metric" type="button" @click="openMetric(metric.key)">
          <em :class="metric.available ? 'good' : 'muted'">{{ metric.available ? 'считается' : 'заглушка' }}</em>
          <span>{{ metric.title }}</span>
          <b>{{ metric.available ? formatMetric(metric) : '—' }}</b>
        </button>
      </div>
      <template v-else>
        <article v-for="(item, index) in debrief.guidance" :key="index" class="card growth-note">
          <p class="muted">Точка роста</p>
          <b>{{ item.advice }}</b>
          <p>{{ item.claim }}</p>
          <p class="muted">«{{ item.evidence.quote }}»</p>
        </article>
        <div class="metrics">
          <button v-for="metric in growthMetrics" :key="metric.key" class="metric" type="button" @click="openMetric(metric.key)">
            <em :class="metric.available ? 'good' : 'muted'">{{ metric.available ? 'считается' : 'заглушка' }}</em>
            <span>{{ metric.title }}</span>
            <b>{{ metric.available ? formatMetric(metric) : '—' }}</b>
          </button>
        </div>
      </template>
      <button class="linkish debrief-link" type="button" @click="step = 'glossary'">Что значат метрики</button>
      <button class="btn tg-hide" type="button" @click="again">Новый созвон</button>
      <button class="btn ghost" type="button" @click="again">Новая попытка</button>
    </template>

    <template v-else-if="selected && step === 'metric'">
      <button class="back" type="button" @click="step = 'summary'"><img :src="backIcon" alt="" width="20" height="20" /></button>
      <h1>{{ selected.title }}</h1>
      <p class="muted">{{ COPY[selected.key]?.en }}</p>
      <p class="body">{{ COPY[selected.key]?.text ?? 'Как эта метрика считается в разборе.' }}</p>
      <section class="card meter">
        <div class="meter-top"><span>Твой результат</span><b>{{ formatMetric(selected) }}</b></div>
        <div class="track"><i :style="{ width: `${ratio(selected)}%` }" /></div>
        <div class="meter-scale"><span>0%</span><span>порог</span><span>100%</span></div>
      </section>
      <button class="btn tg-hide" type="button" @click="step = 'summary'">Все метрики</button>
    </template>

    <template v-else-if="debrief && step === 'glossary'">
      <header class="pick-head">
        <button class="back" type="button" @click="step = 'summary'"><img :src="backIcon" alt="" width="20" height="20" /></button>
        <b>Глоссарий</b>
        <span />
      </header>
      <h1 class="glossary-title">Что значат метрики</h1>
      <label class="glossary-search">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="5.25" stroke="currentColor" stroke-width="1.6" />
          <path d="M12 12.5L15.2 15.7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
        </svg>
        <input v-model="glossaryQuery" type="search" placeholder="Найти метрику" autocomplete="off" />
      </label>

      <section v-if="glossaryMvp.length" class="glossary-block">
        <div class="glossary-section">
          <h2>Считаем в MVP</h2>
          <i />
        </div>
        <article class="card glossary-card">
          <div v-for="item in glossaryMvp" :key="item.en" class="glossary-row">
            <i />
            <div>
              <b>{{ item.title }}</b>
              <p class="en">{{ item.en }}</p>
              <p>{{ item.text }}</p>
            </div>
          </div>
        </article>
      </section>

      <article v-if="glossaryDerived.length" class="card glossary-derived">
        <h2>Производные</h2>
        <p v-for="item in glossaryDerived" :key="item.title"><b>{{ item.title }}</b> — {{ item.text }}</p>
      </article>

      <section v-if="glossaryPlanned.length" class="glossary-block">
        <h2 class="glossary-section planned">В разработке</h2>
        <article class="card glossary-card planned">
          <div v-for="item in glossaryPlanned" :key="item.en" class="glossary-row">
            <i />
            <div>
              <b>{{ item.title }}</b>
              <p class="en">{{ item.en }}</p>
            </div>
          </div>
        </article>
      </section>

      <p v-if="glossaryEmpty" class="muted">Ничего не нашлось</p>
    </template>

    <template v-else-if="step === 'links'">
      <button class="back" type="button" @click="route.query.link === '1' ? router.push('/scenarios') : (sheet = true, step = 'summary')"><img :src="backIcon" alt="" width="20" height="20" /></button>
      <h1>Ссылка на разбор</h1>
      <p class="muted">Руководитель увидит итог. Ссылка действует 24 часа.</p>
      <p v-if="!links.length" class="muted">Ссылок пока нет.</p>
      <article v-for="item in links" :key="item.id" class="card stack">
        <b>{{ negotiation?.scenario.title ?? 'Разбор' }}</b>
        <p class="muted">{{ linkState(item) }} · до {{ new Date(item.expiresAt).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }}</p>
        <p class="link-url">{{ absoluteUrl(item.url) }}</p>
        <button class="btn" type="button" :disabled="pending || item.revoked" @click="copyLink">{{ copied ? 'Ссылка скопирована' : 'Скопировать ссылку' }}</button>
        <button v-if="!item.revoked && linkState(item) === 'активна'" class="btn ghost" type="button" @click="revoke(item)">Отозвать</button>
      </article>
    </template>

    <div v-if="sheet" class="sheet-backdrop" @click.self="sheet = false">
      <section class="sheet">
        <h2>Поделиться с руководителем</h2>
        <p class="muted">Увидит итоговый балл и «Итог сделки». «Мой рост» и транскрипт скрыты, пока их не включить.</p>
        <p class="muted">Ссылка действует</p>
        <div class="ttl">
          <button type="button" :class="{ on: ttlHours === 24 }" @click="ttlHours = 24">24 часа</button>
          <button type="button" :class="{ on: ttlHours === 720 }" @click="ttlHours = 720">30 дней</button>
        </div>
        <label class="share-toggle">
          <span>Показать транскрипт<small>По умолчанию скрыт</small></span>
          <button class="toggle" :class="{ on: includeTranscript }" type="button" @click="includeTranscript = !includeTranscript"><i /></button>
        </label>
        <button class="btn tg-hide" type="button" :disabled="pending" @click="sendTelegram">Отправить в Telegram</button>
        <button class="linkish" type="button" :disabled="pending" @click="copyLink">{{ copied ? 'Ссылка скопирована' : 'Скопировать ссылку' }}</button>
        <button class="linkish" type="button" @click="sheet = false; step = 'links'">Мои ссылки</button>
      </section>
    </div>
  </main>
</template>
