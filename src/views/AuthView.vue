<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import flag from '@/assets/onboarding/flag.svg'
import flagPole from '@/assets/onboarding/flag-pole.svg'
import peaks from '@/assets/onboarding/peaks.svg'
import snow from '@/assets/onboarding/snow.svg'
import { ApiError } from '@/api'
import { useSessionStore } from '@/stores/session'
import { readTelegramProfile, useTelegramButtons } from '@/telegram'

const session = useSessionStore()
const router = useRouter()
const route = useRoute()
const step = ref<'hero' | 'form'>('hero')
const mode = ref<'up' | 'in'>('up')
const login = ref('')
const password = ref('')
const error = ref('')
const pending = ref(false)
const nextPath = computed(() => (typeof route.query.next === 'string' ? route.query.next : session.returnPath))
const fromTelegram = Boolean(readTelegramProfile())

function submitAuth() {
  void run(() => mode.value === 'in' ? session.signIn(login.value, password.value) : session.signUp(login.value, password.value))
}

useTelegramButtons(() => fromTelegram
  ? { main: null, back: null }
  : step.value === 'hero'
  ? { main: { text: 'Начать восхождение', onClick: () => { step.value = 'form' } }, back: null }
  : {
      main: { text: 'Далее', enabled: !pending.value, progress: pending.value, onClick: submitAuth },
      back: () => { step.value = 'hero' },
    })

function afterAuth() {
  if (session.greetOnEntry && session.onboarded) return { name: 'welcome' as const }
  return session.onboarded ? nextPath.value : '/onboarding'
}

async function run(action: () => Promise<void>) {
  error.value = ''
  pending.value = true
  try {
    await action()
    await router.replace(afterAuth())
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Не получилось войти'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <main v-if="fromTelegram" class="screen bare" />

  <main v-else-if="step === 'hero'" class="screen bare auth-hero hero-sky">
    <div class="auth-copy">
      <h1>В переговорах тоже берут высоту</h1>
      <p class="body">Тренируйся с ИИ-собеседниками<br>и поднимайся выше с каждой сделкой</p>
    </div>
    <img class="auth-peaks" :src="peaks" alt="" />
    <img class="auth-snow" :src="snow" alt="" />
    <img class="auth-pole" :src="flagPole" alt="" />
    <img class="auth-flag" :src="flag" alt="" />
    <!-- <button class="btn tg-hide auth-cta" type="button" @click="step = 'form'">Начать восхождение</button> -->
  </main>

  <main v-else class="screen bare auth-form">
    <h1>Добро пожаловать!</h1>
    <p class="muted lead">Тренируйте переговоры в безопасной среде, пробуйте разные стратегии и получайте обратную связь после каждой сессии.</p>
    <form class="auth-fields" @submit.prevent="run(() => mode === 'in' ? session.signIn(login, password) : session.signUp(login, password))">
      <label class="field">Логин<input v-model="login" autocomplete="username" required /></label>
      <label class="field">Пароль<input v-model="password" type="password" autocomplete="current-password" minlength="6" required /></label>
      <p v-if="error" class="error">{{ error }}</p>
      <p class="muted auth-switch">
        {{ mode === 'up' ? 'Уже есть аккаунт?' : 'Нет аккаунта?' }}
        <button class="linkish" type="button" @click="mode = mode === 'up' ? 'in' : 'up'">{{ mode === 'up' ? 'Войти' : 'Регистрация' }}</button>
      </p>
      <div class="auth-actions">
        <button class="btn ghost" type="button" :disabled="pending" @click="run(() => session.guest())">Пропустить</button>
        <button class="btn tg-hide" type="submit" :disabled="pending">Далее</button>
      </div>
    </form>
  </main>
</template>
