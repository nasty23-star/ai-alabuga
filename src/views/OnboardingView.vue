<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import backIcon from '@/assets/onboarding/back.svg'
import climbDotA from '@/assets/onboarding/climb-dot-a.svg'
import climbDotB from '@/assets/onboarding/climb-dot-b.svg'
import climbDotC from '@/assets/onboarding/climb-dot-c.svg'
import climbHills from '@/assets/onboarding/climb-hills.svg'
import climbRoute from '@/assets/onboarding/climb-route.svg'
import flag from '@/assets/onboarding/flag.svg'
import flagPole from '@/assets/onboarding/flag-pole.svg'
import { ApiError } from '@/api'
import type { SphereId } from '@/api/types'
import { useGamificationStore } from '@/stores/gamification'
import { useSessionStore } from '@/stores/session'

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
const slide = ref(0)
const name = ref(session.account?.display_name ?? '')
const selected = ref<SphereId[]>([...(session.account?.spheres ?? [])])
const error = ref('')
const pending = ref(false)
const slides = gamification.active ? [0, 1] : [0]

function toggle(id: SphereId) {
  selected.value = selected.value.includes(id) ? selected.value.filter((item) => item !== id) : [...selected.value, id]
}

function next() {
  if (slide.value < slides.length - 1) slide.value += 1
  else slide.value = 99
}

async function save() {
  error.value = ''
  pending.value = true
  try {
    await session.saveProfile(name.value.trim() || 'Мистер X', selected.value)
    await router.push('/scenarios')
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Не удалось сохранить'
  } finally {
    pending.value = false
  }
}

function later() {
  session.skipOnboarding()
  void router.push('/scenarios')
}
</script>

<template>
  <main v-if="slide === 0" class="screen bare">
    <section class="sky" style="height: 388px; border-radius: 37px; position: relative; overflow: hidden">
      <article class="card" style="position: absolute; top: 96px; left: 28px; width: 250px; display: flex; gap: 12px; align-items: center">
        <span style="width: 50px; height: 50px; border-radius: 50%; background: #8fb0e8" />
        <span><b style="font-size: 13px">Токсичная CPO</b><span class="muted" style="display: block">давит и перебивает</span></span>
      </article>
      <article class="card" style="position: absolute; top: 180px; left: 58px; width: 240px; display: flex; gap: 12px; align-items: center">
        <span style="width: 50px; height: 50px; border-radius: 50%; background: #5d7eb8" />
        <span><b style="font-size: 13px">Занятой CEO</b><span class="muted" style="display: block">цифры и итог</span></span>
      </article>
      <article class="card" style="position: absolute; top: 264px; left: 28px; width: 250px; background: #1a5cff; color: #fff; display: flex; gap: 12px; align-items: center">
        <span style="width: 44px; height: 44px; border-radius: 50%; background: #d9f99d; color: #1a5cff; display: grid; place-items: center; font-weight: 700">+</span>
        <span><b style="font-size: 13px">Твой собеседник</b><span style="display: block; font-size: 12px; opacity: 0.7">по реальному человеку</span></span>
      </article>
    </section>
    <div class="dots"><i class="on" /><i /><i /></div>
    <h1 style="text-align: center; max-width: 252px; margin: 0 auto">Практикуй переговоры с ИИ</h1>
    <p class="body" style="text-align: center">Готовые характеры или копия реального человека — клиента, начальника, подрядчика.</p>
    <button class="btn ghost" type="button" @click="later">Пропустить</button>
    <button class="btn" type="button" @click="next">Далее</button>
  </main>

  <main v-else-if="slide === 1" class="screen bare">
    <button class="back" type="button" @click="slide = 0"><img :src="backIcon" alt="" width="20" height="20" /></button>
    <section class="sky" style="height: 380px; border-radius: 37px; position: relative; overflow: hidden">
      <img :src="climbHills" alt="" style="position: absolute; left: -24px; bottom: 0; width: 480px; max-width: none" />
      <img :src="climbRoute" alt="" style="position: absolute; left: 30%; top: 30%; width: 33%" />
      <img :src="flagPole" alt="" style="position: absolute; left: 33%; top: 21%; height: 34px" />
      <img :src="flag" alt="" style="position: absolute; left: 32%; top: 20%; width: 28px" />
      <img :src="climbDotC" alt="" style="position: absolute; left: 27%; top: 39%; width: 24px" />
      <img :src="climbDotB" alt="" style="position: absolute; left: 49%; top: 58%; width: 20px" />
      <img :src="climbDotA" alt="" style="position: absolute; left: 61%; top: 79%; width: 16px" />
    </section>
    <div class="dots"><i /><i /><i class="on" /></div>
    <h1 style="text-align: center">Поднимайся выше</h1>
    <p class="body" style="text-align: center">Каждая сделка — шаг к вершине. Разбор покажет, где ты вырос и что попробовать дальше.</p>
    <button class="btn ghost" type="button" @click="later">Пропустить</button>
    <button class="btn" type="button" @click="next">Далее</button>
  </main>

  <main v-else class="screen bare" style="padding-top: 64px">
    <h1>Расскажи о себе</h1>
    <p class="muted">Подберём сценарии под твою работу</p>
    <form style="display: flex; flex-direction: column; gap: 16px; margin-top: 16px" @submit.prevent="save">
      <label class="field">Как к тебе обращаться<input v-model="name" placeholder="Введите имя" /></label>
      <div class="row">
        <button v-for="sphere in spheres" :key="sphere.id" type="button" class="chip" :class="{ on: selected.includes(sphere.id) }" @click="toggle(sphere.id)">{{ sphere.title }}</button>
      </div>
      <p v-if="error" class="error">{{ error }}</p>
      <button class="btn ghost" type="button" @click="later">Пропустить</button>
      <button class="btn" type="submit" :disabled="pending">Далее</button>
    </form>
  </main>
</template>
