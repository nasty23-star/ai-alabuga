<script setup lang="ts">
import { useRouter } from 'vue-router'
import flag from '@/assets/onboarding/flag.svg'
import flagPole from '@/assets/onboarding/flag-pole.svg'
import peaks from '@/assets/onboarding/peaks.svg'
import snow from '@/assets/onboarding/snow.svg'

const router = useRouter()

function practice() {
  void router.push('/history')
}
</script>

<template>
  <main class="screen bare welcome">
    <div class="welcome-sky hero-sky">
      <h1>С возвращением!</h1>
      <img class="welcome-peaks" :src="peaks" alt="" />
      <img class="welcome-snow" :src="snow" alt="" />
      <img class="welcome-pole" :src="flagPole" alt="" />
      <img class="welcome-flag" :src="flag" alt="" />
    </div>
    <div class="welcome-action">
      <button class="btn" type="button" @click="practice">Тренироваться</button>
    </div>
  </main>
</template>
