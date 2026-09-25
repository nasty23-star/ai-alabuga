<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import backIcon from '@/assets/onboarding/back.svg'
import peaksQuestionIcon from '@/assets/onboarding/peaks-question.png'
import peaksVerholazIcon from '@/assets/onboarding/peaks-verholaz.png'
import peaksKamnegryzIcon from '@/assets/onboarding/peaks-kamnegryz.png'
import peaksSkalozavrIcon from '@/assets/onboarding/peaks-skalozavr.png'
import peaksVershinoidIcon from '@/assets/onboarding/peaks-vershinoid.png'
import peaksTsarIcon from '@/assets/onboarding/peaks-tsar.png'
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
        <template v-if="peak.earned">
          <img v-if="peak.id === 'verholaz'" :src="peaksVerholazIcon" class="peak-art" alt="" width="72" height="72" />
          <img v-else-if="peak.id === 'kamnegryz'" :src="peaksKamnegryzIcon" class="peak-art" alt="" width="72" height="72" />
          <img v-else-if="peak.id === 'skalozavr'" :src="peaksSkalozavrIcon" class="peak-art" alt="" width="72" height="72" />
          <img v-else-if="peak.id === 'vershinoid'" :src="peaksVershinoidIcon" class="peak-art" alt="" width="72" height="72" />
          <img v-else-if="peak.id === 'tsar'" :src="peaksTsarIcon" class="peak-art" alt="" width="72" height="72" />
        </template>
        <img v-else :src="peaksQuestionIcon" class="peak-art" alt="" width="72" height="72" />
        <b>{{ peak.title }}</b>
        <p>{{ peak.caption }}</p>
      </article>
    </div>
  </main>
</template>
