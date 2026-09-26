<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import backIcon from '@/assets/onboarding/back.svg'
import { GLOSSARY_DERIVED, GLOSSARY_MVP, GLOSSARY_PLANNED } from '@/glossary'
import { useTelegramButtons } from '@/telegram'

const router = useRouter()
const query = ref('')

function hit(parts: Array<string | undefined>, needle: string) {
  return parts.some((part) => part?.toLowerCase().includes(needle))
}

const mvp = computed(() => {
  const needle = query.value.trim().toLowerCase()
  if (!needle || 'считаем в mvp'.includes(needle)) return GLOSSARY_MVP
  return GLOSSARY_MVP.filter((item) => hit([item.title, item.en, item.text], needle))
})

const derived = computed(() => {
  const needle = query.value.trim().toLowerCase()
  if (!needle || 'производные'.includes(needle)) return GLOSSARY_DERIVED
  return GLOSSARY_DERIVED.filter((item) => hit([item.title, item.text], needle))
})

const planned = computed(() => {
  const needle = query.value.trim().toLowerCase()
  if (!needle || 'в разработке'.includes(needle)) return GLOSSARY_PLANNED
  return GLOSSARY_PLANNED.filter((item) => hit([item.title, item.en], needle))
})

const empty = computed(() => !mvp.value.length && !derived.value.length && !planned.value.length)

function leave() {
  if (router.options.history.state.back) void router.back()
  else void router.push({ name: 'progress' })
}

useTelegramButtons(() => ({ main: null, back: leave }))
</script>

<template>
  <main class="screen">
    <header class="pick-head">
      <button class="back" type="button" @click="leave"><img :src="backIcon" alt="" width="20" height="20" /></button>
      <b>Глоссарий</b>
      <span />
    </header>
    <h1 class="glossary-title">Что значат метрики</h1>
    <label class="glossary-search" for="glossary-search">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="5.25" stroke="currentColor" stroke-width="1.6" />
        <path d="M12 12.5L15.2 15.7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
      </svg>
      <input id="glossary-search" name="glossary" v-model="query" type="search" placeholder="Найти метрику" autocomplete="off" />
    </label>

    <section v-if="mvp.length" class="glossary-block">
      <div class="glossary-section">
        <h2>Считаем в MVP</h2>
        <i />
      </div>
      <article class="card glossary-card">
        <div v-for="item in mvp" :key="item.en" class="glossary-row">
          <i />
          <div>
            <b>{{ item.title }}</b>
            <p class="en">{{ item.en }}</p>
            <p>{{ item.text }}</p>
          </div>
        </div>
      </article>
    </section>

    <article v-if="derived.length" class="card glossary-derived">
      <h2>Производные</h2>
      <p v-for="item in derived" :key="item.title"><b>{{ item.title }}</b> — {{ item.text }}</p>
    </article>

    <p v-if="empty" class="muted">Ничего не нашлось</p>

    <button class="back" type="button" @click="leave"><img :src="backIcon" alt="" width="20" height="20" /></button>
  </main>
</template>
