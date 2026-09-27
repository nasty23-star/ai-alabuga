<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import personaCpo from '@/assets/onboarding/persona-toxic-cpo.png'
import personaCeo from '@/assets/onboarding/persona-busy-ceo.png'
import backIcon from '@/assets/onboarding/back.svg'
import climbSky from '@/assets/onboarding/climb-sky.svg'
import micIcon from '@/assets/onboarding/mic.svg'
import liteHills from '@/assets/onboarding/lite-hills.svg'
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
const slides = [0, 1, 2]

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

// useTelegramButtons(() => ({
//   main: {
//     text: 'Далее',
//     enabled: !pending.value,
//     progress: pending.value,
//     onClick: () => { if (slide.value === 99) void save(); else next() },
//   },
//   back: slide.value > 0 ? back : null,
// }))
</script>

<template>
  <main v-if="slide === 0" class="screen bare">
    <button class="back" style="visibility: hidden;" type="button" @click="back"><img :src="backIcon" alt="" width="20" height="20" /></button>

    <section class="sky" style="height: 380px; border-radius: 37px; position: relative; overflow: hidden">
      <img class="lite-hills" :src="liteHills" alt="" />
      <span class="lite-hills-blur"></span>
      <article class="card" style="position: absolute; top: 110px; left: 28px; width: 250px; display: flex; gap: 12px; align-items: center">
        <img class="persona-avatar" :src="personaCpo" alt="" width="50" height="50" />
        <span><b style="font-size: 13px">Токсичный CPO</b><span class="muted" style="display: block">давит и перебивает</span></span>
      </article>
      <article class="card" style="position: absolute; top: 194px; left: 58px; width: 240px; display: flex; gap: 12px; align-items: center">
        <img class="persona-avatar" :src="personaCeo" alt="" width="50" height="50" />
        <span><b style="font-size: 13px">Занятой CEO</b><span class="muted" style="display: block">цифры и итог</span></span>
      </article>
      <article class="card" style="position: absolute; top: 275px; left: 28px; width: 250px; background: #1a5cff; color: #fff; display: flex; gap: 12px; align-items: center">
        <span style="width: 44px; height: 44px; border-radius: 50%; background: #e5f6b4; color: #365314; display: grid; place-items: center; font-weight: 700">+</span>
        <span><b style="font-size: 13px">Твой собеседник</b><span style="display: block; font-size: 12px; opacity: 0.7">по реальному человеку</span></span>
      </article>
    </section>
    <div class="dots"><i class="on" /><i /><i /></div>
    <h1 style="text-align: center; max-width: 252px; margin: 0 auto">Практикуй переговоры с ИИ</h1>
    <p class="body" style="text-align: center">Готовые характеры или копия реального человека — клиента, начальника, подрядчика.</p>
    <div class="btn-actions">
      <button class="btn ghost" type="button" @click="later">Пропустить</button>
      <button class="btn tg-hide" type="button" @click="next">Далее</button>
    </div>
  </main>

  <main v-else-if="slide === 1" class="screen bare">
    <button class="back" type="button" @click="back"><img :src="backIcon" alt="" width="20" height="20" /></button>
    <section class="sky voice-sky">
      <img class="lite-hills" :src="liteHills" alt="" />
      <span class="lite-hills-blur"></span>
      <div class="voice-player">
        <span class="voice-play" aria-hidden="true">
          <svg width="11" height="11" viewBox="0 0 12 12"><path d="M3.4 1.5 10.2 6 3.4 10.5Z" fill="#fff" /></svg>
        </span>
        <svg class="voice-wave" viewBox="0 0 108 20" width="124" height="20" aria-hidden="true">
          <g fill="#1a5cff">
            <rect x="0" y="2.5" width="3" height="15" rx="1" />
            <rect x="5" y="3.5" width="3" height="13" rx="1" />
            <rect x="10" y="4" width="3" height="12" rx="1" />
            <rect x="15" y="5" width="3" height="10" rx="1" />
            <rect x="20" y="5.5" width="3" height="9" rx="1" />
            <rect x="25" y="6.5" width="3" height="7" rx="1" />
            <rect x="30" y="7" width="3" height="6" rx="1" />
            <rect x="35" y="8" width="3" height="4" rx="1" />
            <rect x="40" y="8.5" width="3" height="3" rx="1" />
            <rect x="45" y="1" width="3" height="18" rx="1" />
            <rect x="50" y="2" width="3" height="16" rx="1" />
            <rect x="55" y="2.5" width="3" height="15" rx="1" />
            <rect x="60" y="3.5" width="3" height="13" rx="1" />
            <rect x="65" y="4" width="3" height="12" rx="1" />
            <rect x="70" y="5" width="3" height="10" rx="1" />
            <rect x="75" y="5.5" width="3" height="9" rx="1" />
            <rect x="80" y="6.5" width="3" height="7" rx="1" />
            <rect x="85" y="7" width="3" height="6" rx="1" />
            <rect x="90" y="8" width="3" height="4" rx="1" />
            <rect x="95" y="8.5" width="3" height="3" rx="1" />
            <rect x="100" y="1" width="3" height="18" rx="1" />
            <rect x="105" y="2" width="3" height="16" rx="1" />
          </g>
        </svg>
        <span class="voice-time">0:12</span>
      </div>
      <div class="voice-mic" aria-hidden="true">
        <span class="voice-mic-btn"><img :src="micIcon" alt="" width="30" height="30" /></span>
      </div>
    </section>
    <div class="dots"><i /><i class="on" /><i /></div>
    <h1 style="text-align: center">Говори голосом<br>(в разработке)</h1>
    <p class="body" style="text-align: center; max-width: 268px; margin-inline: auto">Пока голосовые в разработке, пиши как в мессенджере. ИИ расшифрует и ответит голосом собеседника.</p>
    <div class="btn-actions">
      <button class="btn ghost" type="button" @click="later">Пропустить</button>
      <button class="btn tg-hide" type="button" @click="next">Далее</button>
    </div>
  </main>

  <main v-else-if="slide === 2" class="screen bare">
    <button class="back" type="button" @click="back"><img :src="backIcon" alt="" width="20" height="20" /></button>
    <section class="sky climb-sky">
      <img class="climb-sky-bg" style="width: 100%; height: 100%; object-fit: cover;" :src="climbSky" alt="" />
    </section>
    <div class="dots"><i /><i /><i class="on" /></div>
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
