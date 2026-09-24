<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import navBell from '@/assets/onboarding/nav-bell.svg'
import navChart from '@/assets/onboarding/nav-chart.svg'
import navFile from '@/assets/onboarding/nav-file.svg'
import navHome from '@/assets/onboarding/nav-home.svg'
import SplashScreen from '@/components/SplashScreen.vue'
import { useGamificationStore } from '@/stores/gamification'
import { useSessionStore } from '@/stores/session'
import { setBackButton, setMainButton } from '@/telegram'

const SPLASH_MS = 900

const route = useRoute()
const session = useSessionStore()
const gamification = useGamificationStore()
const booting = ref(true)
const bare = computed(() => Boolean(route.meta.bare))
const showNav = computed(() => !booting.value && session.isAuthenticated && session.onboarded && !bare.value && route.name !== 'chat' && route.name !== 'wizard')

watch(booting, (value) => {
  if (!value) return
  setMainButton(null)
  setBackButton(null)
})

watch(() => route.fullPath, () => {
  gamification.hydrate()
}, { immediate: true })

onMounted(async () => {
  gamification.hydrate()
  const started = Date.now()
  if (session.isAuthenticated) {
    try {
      await session.refresh()
    } catch {
      // Локальная сессия остаётся, если аккаунт сейчас не обновить.
    }
  }
  const wait = SPLASH_MS - (Date.now() - started)
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
  booting.value = false
})
</script>

<template>
  <div class="stage">
    <div class="phone">
      <SplashScreen v-if="booting" />
      <router-view />
      <nav v-if="showNav" class="nav">
        <router-link to="/scenarios" aria-label="Сценарии"><img :src="navHome" alt="" width="28" height="28" /></router-link>
        <router-link to="/wizard" aria-label="Новые переговоры"><img :src="navFile" alt="" width="24" height="24" /></router-link>
        <router-link to="/history" aria-label="Разбор"><img :src="navChart" alt="" width="28" height="28" /></router-link>
        <router-link to="/settings" aria-label="Профиль"><img :src="navBell" alt="" width="28" height="28" /></router-link>
      </nav>
    </div>
  </div>
</template>
