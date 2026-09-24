<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import navBell from '@/assets/onboarding/nav-bell.svg?raw'
import navChart from '@/assets/onboarding/nav-chart.svg?raw'
import navFile from '@/assets/onboarding/nav-file.svg?raw'
import navHome from '@/assets/onboarding/nav-home.svg?raw'
import SplashScreen from '@/components/SplashScreen.vue'
import { useGamificationStore } from '@/stores/gamification'
import { useSessionStore } from '@/stores/session'
import { readTelegramProfile, setBackButton, setMainButton } from '@/telegram'

const SPLASH_MS = 900

const route = useRoute()
const router = useRouter()
const session = useSessionStore()
const gamification = useGamificationStore()
const booting = ref(true)
const bare = computed(() => Boolean(route.meta.bare))
const showNav = computed(() => !booting.value && session.isAuthenticated && session.onboarded && !bare.value && route.name !== 'chat' && route.name !== 'wizard')
const navItems = [
  { to: '/scenarios', label: 'Сценарии', icon: navHome, match: ['scenarios'] },
  { to: '/wizard', label: 'Новые переговоры', icon: navFile, match: ['wizard'] },
  { to: '/history', label: 'Разбор', icon: navChart, match: ['history', 'debrief'] },
  { to: '/settings', label: 'Профиль', icon: navBell, match: ['settings'] },
]

function navActive(match: string[]) {
  return match.includes(String(route.name))
}

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
  const profile = readTelegramProfile()
  if (profile && session.login !== `tg:${profile.id}`) {
    try {
      await session.signInTelegram(profile)
      await router.replace(session.greetOnEntry && session.onboarded ? { name: 'welcome' } : (session.onboarded ? '/scenarios' : '/onboarding'))
    } catch {
      // Без данных Telegram остаётся обычный вход.
    }
  } else if (session.isAuthenticated) {
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
        <router-link v-for="item in navItems" :key="item.to" :to="item.to" :class="{ 'is-active': navActive(item.match) }" :aria-current="navActive(item.match) ? 'page' : undefined">
          <span class="nav-icon" v-html="item.icon" />
          <span>{{ item.label }}</span>
        </router-link>
      </nav>
    </div>
  </div>
</template>
