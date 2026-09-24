<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import flag from '@/assets/onboarding/flag.svg'
import flagPole from '@/assets/onboarding/flag-pole.svg'
import peaks from '@/assets/onboarding/peaks.svg'
import snow from '@/assets/onboarding/snow.svg'
import { ApiError } from '@/api'
import { useSessionStore } from '@/stores/session'

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

async function run(action: () => Promise<void>) {
  error.value = ''
  pending.value = true
  try {
    await action()
    await router.push(session.onboarded ? nextPath.value : '/onboarding')
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Не получилось войти'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <main v-if="step === 'hero'" class="screen bare" style="padding: 0">
    <div class="hero-sky" style="position: relative; flex: 1; min-height: 70dvh; overflow: hidden">
      <div style="padding: 60px 16px 0">
        <h1 style="font-size: 38px; line-height: 42px; letter-spacing: -1.14px; max-width: 355px">В переговорах тоже берут высоту</h1>
        <p class="body" style="margin-top: 16px; max-width: 334px">Тренируйся с ИИ-собеседниками<br>и поднимайся выше с каждой сделкой</p>
      </div>
      <img :src="peaks" alt="" style="position: absolute; left: -180px; bottom: 0; width: 760px; max-width: none" />
      <img :src="snow" alt="" style="position: absolute; left: 20px; bottom: 0; width: 520px; max-width: none" />
      <img :src="flagPole" alt="" style="position: absolute; left: 180px; bottom: 150px; height: 35px" />
      <img :src="flag" alt="" style="position: absolute; left: 178px; bottom: 176px; width: 28px" />
    </div>
    <div style="background: #1c2a60; padding: 8px 16px 18px">
      <button class="btn" type="button" @click="step = 'form'">Начать восхождение</button>
    </div>
  </main>

  <main v-else class="screen bare">
    <div style="padding-top: 88px">
      <h1>Добро пожаловать!</h1>
      <p class="muted" style="margin-top: 8px">Тренируйте переговоры в безопасной среде, пробуйте разные стратегии и получайте обратную связь после каждой сессии.</p>
      <form class="stack" style="margin-top: 20px; display: flex; flex-direction: column; gap: 12px" @submit.prevent="run(() => mode === 'in' ? session.signIn(login, password) : session.signUp(login, password))">
        <label class="field">Логин<input v-model="login" autocomplete="username" required /></label>
        <label class="field">Пароль<input v-model="password" type="password" autocomplete="current-password" minlength="6" required /></label>
        <p v-if="error" class="error">{{ error }}</p>
        <p class="muted" style="text-align: center">
          {{ mode === 'up' ? 'Уже есть аккаунт?' : 'Нет аккаунта?' }}
          <button class="linkish" type="button" @click="mode = mode === 'up' ? 'in' : 'up'">{{ mode === 'up' ? 'Войти' : 'Регистрация' }}</button>
        </p>
        <button class="btn ghost" type="button" :disabled="pending" @click="run(() => session.guest())">Пропустить</button>
        <button class="btn" type="submit" :disabled="pending">Далее</button>
      </form>
    </div>
  </main>
</template>
