<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ApiError, getApi } from '@/api'
import badgeIcon from '@/assets/onboarding/badge.svg'
import type { SphereId } from '@/api/types'
import { useGamificationStore } from '@/stores/gamification'
import { useSessionStore } from '@/stores/session'
import { closeMiniApp, useTelegramButtons } from '@/telegram'
import chevronLight from '@/assets/onboarding/chevron-light.svg'

const spheres: { id: SphereId; title: string }[] = [
  { id: 'procurement', title: 'Закупки' },
  { id: 'sales', title: 'Продажи' },
  { id: 'hiring', title: 'Найм' },
  { id: 'management', title: 'Управление' },
  { id: 'founder', title: 'Основатель' },
]

const session = useSessionStore()
const gamification = useGamificationStore()
const router = useRouter()
const name = ref(session.account?.display_name ?? '')
const selected = ref<SphereId[]>([...(session.account?.spheres ?? [])])
const login = ref('')
const password = ref('')
const error = ref('')
const message = ref('')

onMounted(() => gamification.hydrate())

// useTelegramButtons(() => ({
//   main: { text: 'Сохранить', onClick: () => { void save() } },
//   back: null,
// }))

function toggle(id: SphereId) {
  selected.value = selected.value.includes(id) ? selected.value.filter((item) => item !== id) : [...selected.value, id]
}

async function save() {
  error.value = ''
  try {
    await session.saveProfile(name.value.trim(), selected.value)
    message.value = 'Профиль сохранён'
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Не сохранилось'
  }
}

async function upgrade() {
  error.value = ''
  try {
    await session.upgrade(login.value, password.value)
    gamification.hydrate()
    message.value = 'Аккаунт теперь постоянный, история та же'
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Не удалось'
  }
}

async function logout() {
  await session.signOut()
  await router.push('/auth')
}

function onToggle() {
  gamification.setEnabled(!gamification.enabled)
}
</script>

<template>
  <main class="screen">
    <h1>Профиль</h1>
    <p class="muted">{{ session.account?.is_guest ? 'Гостевой аккаунт' : (session.login.startsWith('tg:') ? (session.account?.display_name || 'Telegram') : session.login) }}</p>
    <form class="stack card" @submit.prevent="save">
      <label class="field">Имя<input v-model="name" /></label>
      <!-- <div class="row" style="flex-wrap: wrap">
        <button v-for="sphere in spheres" :key="sphere.id" type="button" class="chip" :class="{ on: selected.includes(sphere.id) }" @click="toggle(sphere.id)">{{ sphere.title }}</button>
      </div> -->
      <!-- <button class="btn tg-hide" type="submit">Сохранить</button> -->
    </form>
    <section v-if="gamification.allowed" class="card row" style="justify-content: space-between">
      <div>
        <b>Геймификация</b>
        <p class="muted">Бейджи на итогах и в разборе</p>
      </div>
      <button class="toggle" :class="{ on: gamification.enabled }" type="button" @click="onToggle"><i /></button>
    <button button :class="['btn', 'home-call', 'tg-hide', { 'd-none': !gamification.enabled }]" type="button" @click="router.push('/peaks')">
      <img class="settings-badge" :src="badgeIcon" alt="" width="16" height="16" />
      <span>Посмотреть бейджи</span>
      <img :src="chevronLight" alt="" width="20" height="22" />
    </button>  
    </section>
    <form v-if="session.account?.is_guest" class="card stack" @submit.prevent="upgrade">
      <h2>Стать постоянным</h2>
      <label class="field">Логин<input v-model="login" required /></label>
      <label class="field">Пароль<input v-model="password" type="password" minlength="6" required /></label>
      <button class="btn" type="submit">Сохранить аккаунт</button>
    </form>
    <p v-if="message" class="muted">{{ message }}</p>
    <p v-if="error" class="error">{{ error }}</p>
    <button class="btn ghost" type="button" @click="logout">Выйти</button>
    <button class="btn ghost" type="button" @click="closeMiniApp">Закрыть мини-апп</button>
  </main>
</template>
