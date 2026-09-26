<script setup lang="ts">
import { useRouter } from 'vue-router'
import peaks from '@/assets/onboarding/peaks.svg'

const router = useRouter()

function practice() {
  void router.push('/history')
}

// useTelegramButtons(() => ({ main: { text: 'Тренироваться', onClick: practice }, back: null }))
</script>

<template>
  <main class="screen bare bg-hero hero-sky">
    <div class="welcome-sky ">
      <h1>С возвращением!</h1>
      <img class="bg-peaks" :src="peaks" alt="" />
    </div>
    <button class="btn tg-hide btn-cta" type="button" @click="practice">Тренироваться</button>
    <!-- <div class="welcome-action"> -->
    <!-- </div> -->
  </main>
</template>
