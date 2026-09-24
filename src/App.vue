<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import navBell from '@/assets/onboarding/nav-bell.svg'
import navChart from '@/assets/onboarding/nav-chart.svg'
import navFile from '@/assets/onboarding/nav-file.svg'
import navHome from '@/assets/onboarding/nav-home.svg'
import { useGamificationStore } from '@/stores/gamification'
import { useSessionStore } from '@/stores/session'
import { bindBackButton } from '@/telegram'


const route = useRoute()
const router = useRouter()
const session = useSessionStore()
const gamification = useGamificationStore()
const bare = computed(() => Boolean(route.meta.bare))
const showNav = computed(() => session.isAuthenticated && session.onboarded && !bare.value && route.name !== 'chat' && route.name !== 'wizard')

function goBack() {
  if (window.history.length > 1) router.back()
  else void router.push('/scenarios')
}

watch(() => route.fullPath, () => {
  bindBackButton(route.name !== 'scenarios' && route.name !== 'auth', goBack)
  gamification.hydrate()
}, { immediate: true })

onMounted(() => gamification.hydrate())
</script>

<template>
  <div class="stage">
    <div class="phone">
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
