<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import backIcon from '@/assets/onboarding/back.svg'
import { ApiError, getApi } from '@/api'
import type { NegotiationListItem } from '@/api/types'
import { collectPeaks } from '@/gamification/badges'
import { useTelegramButtons } from '@/telegram'

const router = useRouter()
const items = ref<NegotiationListItem[]>([])
const error = ref('')
const peaks = computed(() => collectPeaks(items.value))
const earned = computed(() => peaks.value.filter((item) => item.earned).length)

useTelegramButtons(() => ({
  main: null,
  back: () => { void router.push('/scenarios') },
}))

onMounted(async () => {
  try {
    items.value = (await getApi().listNegotiations(20, null)).items
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Коллекция недоступна'
  }
})
</script>

<template>
  <main class="screen peaks">
    <header class="pick-head">
      <button class="back" type="button" @click="router.push('/scenarios')"><img :src="backIcon" alt="" width="20" height="20" /></button>
      <b>Покорённые вершины</b>
      <span />
    </header>
    <div class="peaks-title">
      <h1>Коллекция</h1>
      <span class="peaks-count">{{ earned }} из {{ peaks.length }}</span>
    </div>
    <p v-if="error" class="error">{{ error }}</p>
    <div class="peaks-grid">
      <article v-for="peak in peaks" :key="peak.id" class="card peak" :class="{ earned: peak.earned }">
        <svg v-if="peak.earned" class="peak-art" viewBox="0 0 72 72" aria-hidden="true">
          <path d="M8 58l16-22 10 12 8-10 22 20H8z" fill="#7eb6ff" />
          <path d="M18 50l10-14 8 8 6-8 16 14H18z" fill="#4d8ef7" />
          <circle cx="36" cy="28" r="14" fill="#5aa2ff" />
          <circle cx="31" cy="26" r="2" fill="#0b1b3a" />
          <circle cx="41" cy="26" r="2" fill="#0b1b3a" />
          <path d="M32 32c2 2 6 2 8 0" stroke="#0b1b3a" stroke-width="1.6" stroke-linecap="round" fill="none" />
          <path d="M24 24l6 4M48 24l-6 4" stroke="#2f6fe0" stroke-width="2" stroke-linecap="round" />
        </svg>
        <svg v-else class="peak-art" viewBox="0 0 72 72" aria-hidden="true">
          <text x="36" y="52" text-anchor="middle" font-size="48" font-weight="700" fill="#5b8def">?</text>
        </svg>
        <b>{{ peak.title }}</b>
        <p>{{ peak.caption }}</p>
      </article>
    </div>
  </main>
</template>
