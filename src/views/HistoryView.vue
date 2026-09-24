<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ApiError, getApi } from '@/api'
import type { NegotiationListItem } from '@/api/types'
import BadgeRow from '@/components/BadgeRow.vue'
import { collectBadges } from '@/gamification/badges'
import { useGamificationStore } from '@/stores/gamification'

const router = useRouter()
const gamification = useGamificationStore()
const items = ref<NegotiationListItem[]>([])
const cursor = ref<string | null>(null)
const error = ref('')
const badges = computed(() => collectBadges(items.value))

async function loadMore() {
  const page = await getApi().listNegotiations(20, cursor.value)
  items.value.push(...page.items)
  cursor.value = page.next_cursor
}

onMounted(async () => {
  gamification.hydrate()
  try {
    await loadMore()
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'История недоступна'
  }
})

function open(item: NegotiationListItem) {
  if (item.status === 'finished') void router.push({ name: 'debrief', params: { id: item.id } })
  else if (item.status === 'active') void router.push({ name: 'chat', params: { id: item.id } })
}
</script>

<template>
  <main class="screen">
    <h1>Мои итоги</h1>
    <p class="muted">Новые переговоры сверху. Прерванные без разбора.</p>
    <section v-if="gamification.active" class="stack">
      <h2>Геймификация</h2>
      <BadgeRow :badges="badges" />
    </section>
    <p v-if="error" class="error">{{ error }}</p>
    <button v-for="item in items" :key="item.id" class="card" type="button" style="text-align: left" @click="open(item)">
      <b>{{ item.theme_title }}</b>
      <p class="muted">{{ item.seat }} · {{ item.counterpart.name }}</p>
      <p class="muted">{{ item.status }}<span v-if="item.outcome?.own_outcome != null"> · {{ item.outcome.own_outcome }}</span></p>
    </button>
    <button v-if="cursor" class="btn ghost" type="button" @click="loadMore">Ещё</button>
  </main>
</template>
