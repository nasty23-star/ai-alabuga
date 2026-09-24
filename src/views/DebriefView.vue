<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ApiError, getApi } from '@/api'
import type { Debrief, NegotiationListItem, SharedLink } from '@/api/types'
import BadgeRow from '@/components/BadgeRow.vue'
import { collectBadges } from '@/gamification/badges'
import { useGamificationStore } from '@/stores/gamification'

const route = useRoute()
const gamification = useGamificationStore()
const debrief = ref<Debrief | null>(null)
const history = ref<NegotiationListItem[]>([])
const error = ref('')
const link = ref<SharedLink | null>(null)
const ttl = ref(72)
const includeTranscript = ref(false)
const id = computed(() => String(route.params.id))
const badges = computed(() => collectBadges(history.value))

onMounted(async () => {
  gamification.hydrate()
  try {
    debrief.value = await getApi().debrief(id.value)
    if (gamification.active) {
      const page = await getApi().listNegotiations(20, null)
      history.value = page.items
    }
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Разбор недоступен'
  }
})

async function share() {
  error.value = ''
  try {
    link.value = await getApi().share(id.value, ttl.value, includeTranscript.value)
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Не удалось открыть ссылку'
  }
}

async function revoke() {
  if (!link.value) return
  await getApi().revokeShare(link.value.id)
  link.value = null
}
</script>

<template>
  <main class="screen">
    <h1>Твой разбор</h1>
    <p v-if="error" class="error">{{ error }}</p>
    <section v-if="debrief" class="card stack">
      <b>Исход: {{ debrief.outcome.type === 'deal' ? 'сделка' : debrief.outcome.type === 'partial_deal' ? 'частичная сделка' : 'без сделки' }}</b>
      <p v-if="debrief.outcome.own_outcome != null">Выгода: {{ debrief.outcome.own_outcome }}</p>
      <p v-for="term in debrief.outcome.terms ?? []" :key="term.type_id">{{ term.name }}: {{ term.value }} {{ term.unit }}</p>
    </section>
    <section v-if="gamification.active" class="stack">
      <h2>Геймификация</h2>
      <BadgeRow :badges="badges" />
    </section>
    <article v-for="metric in debrief?.metrics ?? []" :key="metric.key" class="card">
      <b>{{ metric.title }}</b>
      <p :class="`zone-${metric.zone}`">
        {{ metric.available ? metric.value : metric.unavailable_reason }}
        <span v-if="metric.available && metric.unit !== 'boolean'"> {{ metric.unit }}</span>
      </p>
    </article>
    <article v-for="(item, index) in debrief?.guidance ?? []" :key="index" class="card stack">
      <b>{{ item.claim }}</b>
      <p>{{ item.effect }}</p>
      <p class="muted">{{ item.advice }}</p>
      <p class="muted">Ход {{ item.evidence.turn_index }}: «{{ item.evidence.quote }}»</p>
    </article>
    <form class="card stack" @submit.prevent="share">
      <h2>Для руководителя</h2>
      <label class="field">Часов жизни ссылки<input v-model.number="ttl" type="number" min="1" max="168" /></label>
      <label class="row"><input v-model="includeTranscript" type="checkbox" style="width: auto" /> Приложить транскрипт</label>
      <button class="btn" type="submit">Открыть результат</button>
      <p v-if="link">{{ link.url }} · до {{ new Date(link.expires_at).toLocaleString() }}</p>
      <button v-if="link" class="btn danger" type="button" @click="revoke">Закрыть доступ</button>
    </form>
  </main>
</template>
