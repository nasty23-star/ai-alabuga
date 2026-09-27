<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ApiError, getApi } from '@/api'
import backIcon from '@/assets/onboarding/back.svg'
import badgeIcon from '@/assets/onboarding/badge.svg'
import chevron from '@/assets/onboarding/chevron.svg'
import chevronLight from '@/assets/onboarding/chevron-light.svg'
import { useGamificationStore } from '@/stores/gamification'
import { useSessionStore } from '@/stores/session'
import { closeMiniApp } from '@/telegram'

const session = useSessionStore()
const gamification = useGamificationStore()
const router = useRouter()
const login = ref('')
const password = ref('')
const error = ref('')
const message = ref('')
const displayName = computed(() => session.account?.display_name?.trim() ?? '')
const initial = computed(() => displayName.value.slice(0, 1).toUpperCase())

onMounted(() => gamification.hydrate())

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

async function openLinks() {
  error.value = ''
  try {
    const page = await getApi().listNegotiations(20, null)
    const finished = page.items.find((item) => item.status === 'finished')
    if (finished) await router.push({ name: 'debrief', params: { id: finished.id }, query: { links: '1' } })
    else await router.push({ name: 'history' })
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Ссылки недоступны'
  }
}
</script>

<template>
  <main class="screen profile">
    <header class="pick-head">
      <button class="back" type="button" @click="router.push('/scenarios')"><img :src="backIcon" alt="" width="20" height="20" /></button>
      <b>Профиль</b>
      <span />
    </header>

    <div class="profile-id">
      <span class="profile-avatar" aria-hidden="true">{{ initial }}</span>
      <b>{{ displayName }}</b>
      <b v-if="session.account?.is_guest">Гость</b>
    </div>

    <section class="profile-card">
      <div class="profile-game">
        <div>
          <b>Геймификация</b>
          <p class="muted">Серия и бейджи</p>
        </div>
        <button class="toggle" :class="{ on: gamification.enabled }" type="button" :aria-pressed="gamification.enabled" aria-label="Геймификация" @click="onToggle"><i /></button>
      </div>
      <button v-if="gamification.enabled" class="btn home-call profile-badges" type="button" @click="router.push('/peaks')">
        <img class="settings-badge" :src="badgeIcon" alt="" width="16" height="16" />
        <span>Посмотреть бейджи</span>
        <img :src="chevronLight" alt="" width="20" height="22" />
      </button>
      <button class="profile-link" type="button" @click="router.push({ name: 'summit' })">
        <span>Посмотреть итоги</span>
        <img :src="chevron" alt="" width="22" height="22" />
      </button>
      <button class="profile-link" type="button" @click="openLinks">
        <span>Мои ссылки</span>
        <img :src="chevron" alt="" width="22" height="22" />
      </button>
      <button class="profile-link" type="button" @click="router.push({ name: 'glossary' })">
        <span>Глоссарий метрик</span>
        <img :src="chevron" alt="" width="22" height="22" />
      </button>
      <button class="profile-link" type="button" @click="router.push({ name: 'onboarding' })">
        <span>Пройти обучение заново</span>
        <img :src="chevron" alt="" width="22" height="22" />
      </button>
    </section>

    <!-- <form v-if="session.account?.is_guest" class="card stack" @submit.prevent="upgrade">
      <h2>Стать постоянным пользователем</h2>
      <label class="field">Логин<input v-model="login" required /></label>
      <label class="field">Пароль<input v-model="password" type="password" minlength="6" required /></label>
      <button class="btn" type="submit">Сохранить аккаунт</button>
    </form> -->
    <p v-if="message" class="muted">{{ message }}</p>
    <p v-if="error" class="error">{{ error }}</p>
    <!-- <button class="btn ghost" type="button" @click="logout">Выйти</button>
    <button class="btn ghost" type="button" @click="closeMiniApp">Закрыть мини-апп</button> -->
  </main>
</template>
