<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ApiError, getApi } from '@/api'
import type { SharedResult } from '@/api/types'

const route = useRoute()
const result = ref<SharedResult | null>(null)
const error = ref('')

onMounted(async () => {
  try {
    result.value = await getApi().sharedResult(String(route.params.token))
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Ссылка недоступна'
  }
})
</script>

<template>
  <main class="screen bare">
    <h1>Открытый результат</h1>
    <p v-if="error" class="error">{{ error }}</p>
    <section v-if="result" class="stack">
      <article class="card">
        <b>{{ result.outcome.type }}</b>
        <p v-if="result.outcome.own_outcome != null">Выгода {{ result.outcome.own_outcome }}</p>
      </article>
      <article v-for="metric in result.metrics" :key="metric.key" class="card">
        <b>{{ metric.title }}</b>
        <p>{{ metric.available ? metric.value : metric.unavailable_reason }}</p>
      </article>
      <article v-for="(item, index) in result.guidance" :key="index" class="card">
        <p>{{ item.claim }}</p>
        <p class="muted">{{ item.advice }}</p>
      </article>
      <article v-if="result.transcript" class="stack">
        <h2>Транскрипт</h2>
        <p v-for="turn in result.transcript" :key="`${turn.index}-${turn.speaker}`" class="bubble" :class="turn.speaker">{{ turn.text }}</p>
      </article>
    </section>
  </main>
</template>
