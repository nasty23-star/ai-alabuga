<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import backIcon from '@/assets/onboarding/back.svg'
import climbSky from '@/assets/onboarding/climb-sky.svg'
import { ApiError } from '@/api'
import type { SphereId } from '@/api/types'
import { useSessionStore } from '@/stores/session'
import { useTelegramButtons } from '@/telegram'

const spheres: { id: SphereId; title: string }[] = [
  { id: 'procurement', title: 'Закупки' },
  { id: 'sales', title: 'Продажи' },
  { id: 'hiring', title: 'Найм' },
  { id: 'management', title: 'Управление' },
  { id: 'founder', title: 'Основатель' },
]

const session = useSessionStore()
const router = useRouter()
const slide = ref(0)
const name = ref(session.account?.display_name ?? '')
const selected = ref<SphereId[]>([...(session.account?.spheres ?? [])])
const error = ref('')
const pending = ref(false)
const slides = [0, 1]

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

function back() {
  if (slide.value === 99) slide.value = slides[slides.length - 1]
  else if (slide.value > 0) slide.value -= 1
}

useTelegramButtons(() => ({
  main: {
    text: 'Далее',
    enabled: !pending.value,
    progress: pending.value,
    onClick: () => { if (slide.value === 99) void save(); else next() },
  },
  back: slide.value > 0 ? back : null,
}))
</script>

<template>
  <main v-if="slide === 0" class="screen bare">
    <button class="back" style="visibility: hidden;" type="button" @click="back"><img :src="backIcon" alt="" width="20" height="20" /></button>

    <section class="sky" style="height: 380px; border-radius: 37px; position: relative; overflow: hidden">
      <article class="card" style="position: absolute; top: 76px; left: 28px; width: 250px; display: flex; gap: 12px; align-items: center">
        <span style="width: 50px; height: 50px; border-radius: 50%; background: #8fb0e8" />
        <span><b style="font-size: 13px">Токсичный CPO</b><span class="muted" style="display: block">давит и перебивает</span></span>
      </article>
      <article class="card" style="position: absolute; top: 170px; left: 58px; width: 240px; display: flex; gap: 12px; align-items: center">
        <span style="width: 50px; height: 50px; border-radius: 50%; background: #5d7eb8" />
        <span><b style="font-size: 13px">Занятой CEO</b><span class="muted" style="display: block">цифры и итог</span></span>
      </article>
      <article class="card" style="position: absolute; top: 256px; left: 28px; width: 250px; background: #1a5cff; color: #fff; display: flex; gap: 12px; align-items: center">
        <span style="width: 44px; height: 44px; border-radius: 50%; background: #fff; color: #1a5cff; display: grid; place-items: center; font-weight: 700">+</span>
        <span><b style="font-size: 13px">Твой собеседник</b><span style="display: block; font-size: 12px; opacity: 0.7">по реальному человеку</span></span>
      </article>
    </section>
    <div class="dots"><i class="on" /><i /></div>
    <h1 style="text-align: center; max-width: 252px; margin: 0 auto">Практикуй переговоры с ИИ</h1>
    <p class="body" style="text-align: center">Готовые характеры или копия реального человека — клиента, начальника, подрядчика.</p>
    <div class="btn-actions">
      <button class="btn ghost" type="button" @click="later">Пропустить</button>
      <button class="btn tg-hide" type="button" @click="next">Далее</button>
    </div>
  </main>

  <main v-else-if="slide === 1" class="screen bare">
    <button class="back" type="button" @click="back"><img :src="backIcon" alt="" width="20" height="20" /></button>
    <section class="sky climb-sky">
      <img class="climb-sky-bg" style="width: 100%; height: 100%; object-fit: cover;" :src="climbSky" alt="" />
    </section>
    <div class="dots"><i /><i class="on" /></div>
    <h1 style="text-align: center">Поднимайся выше</h1>
    <p class="body" style="text-align: center">Каждая сделка — шаг к вершине. Разбор покажет, где ты вырос и что попробовать дальше.</p>
    <div class="btn-actions">
      <button class="btn ghost" type="button" @click="later">Пропустить</button>
      <button class="btn tg-hide" type="button" @click="next">Далее</button>
    </div>
  </main>

  <main v-else class="screen bare">
    <button class="back" type="button" @click="back"><img :src="backIcon" alt="" width="20" height="20" /></button>
    <form style="display: flex; flex-direction: column; gap: 6px; height: 100%; margin-top: 16px" @submit.prevent="save">
    <h1>Расскажи о себе</h1>
    <p class="muted">Подберём сценарии под твою работу</p>
      <label class="field" style="margin-top: 24px;">Как к тебе обращаться<input v-model="name" placeholder="Введите имя" /></label>
      <!-- <div class="row">
        <button v-for="sphere in spheres" :key="sphere.id" type="button" class="chip" :class="{ on: selected.includes(sphere.id) }" @click="toggle(sphere.id)">{{ sphere.title }}</button>
      </div> -->
      <p v-if="error" class="error">{{ error }}</p>
      <div class="btn-actions">
        <button class="btn ghost" type="button" @click="later">Пропустить</button>
        <button class="btn tg-hide" type="submit" :disabled="pending">Далее</button>
      </div>
    </form>
  </main>
</template>
