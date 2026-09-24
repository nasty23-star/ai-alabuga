<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ApiError, getApi } from '@/api'
import { useTelegramButtons } from '@/telegram'
import type { CounterpartProfile, IssueDraft, IssueType, Persona, ScenarioCard, Weight } from '@/api/types'

const route = useRoute()
const router = useRouter()
const scenarioId = computed(() => (typeof route.params.scenarioId === 'string' ? route.params.scenarioId : null))
const step = ref(0)
const error = ref('')
const pending = ref(false)
const card = ref<ScenarioCard | null>(null)
const issueTypes = ref<IssueType[]>([])
const personas = ref<Persona[]>([])
const personaId = ref('toxic_cpo')
const goal = ref('')
const batna = ref('')
const note = ref('')
const constraints = ref('')
const issues = ref<IssueDraft[]>([])
const profile = reactive<CounterpartProfile>({
  display_name: '',
  role: '',
  address_form: 'formal',
  reply_length: 'short',
  formality: 0.7,
  traits: [],
  sample_phrases: [],
  source: 'manual',
})
const traitsText = ref('')
const phrasesText = ref('')
const importId = ref('')

const titles = ['Цель', 'Условия', 'Заметки', 'Собеседник']

function typeOf(id: string) {
  return issueTypes.value.find((item) => item.id === id)
}

onMounted(async () => {
  try {
    const [types, people] = await Promise.all([getApi().issueTypes(), getApi().personas()])
    issueTypes.value = types.items
    personas.value = people.items
    if (scenarioId.value) {
      card.value = await getApi().scenario(scenarioId.value)
      goal.value = card.value.defaults.goal
      batna.value = card.value.defaults.batna.text
      issues.value = card.value.defaults.issues.map((issue) => ({ ...issue }))
    } else if (types.items.length >= 2) {
      issues.value = types.items.slice(0, 2).map((item) => ({
        type_id: item.id,
        reservation: item.range[0],
        ideal: Math.min(item.range[1], item.range[0] + 1),
        weight: 'medium' as Weight,
      }))
    }
    const custom = people.items.find((item) => item.id === 'custom' && item.configured)
    if (custom) {
      const saved = await getApi().getCounterpart()
      Object.assign(profile, saved)
      traitsText.value = saved.traits.join(', ')
      phrasesText.value = saved.sample_phrases.join('\n')
    }
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Не удалось открыть визард'
  }
})

function addIssue() {
  const used = new Set(issues.value.map((issue) => issue.type_id))
  const next = issueTypes.value.find((item) => !used.has(item.id))
  if (!next || issues.value.length >= 4) return
  issues.value.push({
    type_id: next.id,
    reservation: next.range[0],
    ideal: Math.min(next.range[1], next.range[0] + 1),
    weight: 'medium',
  })
}

async function importProfile() {
  error.value = ''
  try {
    const draft = await getApi().importCounterpart(importId.value || 'irina')
    Object.assign(profile, draft)
    traitsText.value = draft.traits.join(', ')
    phrasesText.value = draft.sample_phrases.join('\n')
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Импорт недоступен'
  }
}

async function saveProfile() {
  profile.traits = traitsText.value.split(',').map((item) => item.trim()).filter(Boolean)
  profile.sample_phrases = phrasesText.value.split('\n').map((item) => item.trim()).filter(Boolean)
  await getApi().putCounterpart({ ...profile })
}

function back() {
  if (step.value > 0) step.value -= 1
  else void router.push('/scenarios')
}

useTelegramButtons(() => ({
  main: {
    text: step.value < 3 ? 'Далее' : 'Начать',
    enabled: !pending.value,
    progress: pending.value,
    onClick: () => { if (step.value < 3) step.value += 1; else void start() },
  },
  back,
}))

async function start() {
  error.value = ''
  pending.value = true
  try {
    if (personaId.value === 'custom' && profile.display_name.trim()) await saveProfile()
    const created = await getApi().startNegotiation({
      scenario_id: scenarioId.value,
      persona_id: personaId.value,
      terms: {
        goal: goal.value.trim(),
        issues: issues.value,
        batna: { text: batna.value.trim() },
        counterpart_note: note.value.trim() || null,
        own_constraints: constraints.value.trim() || null,
      },
    }, crypto.randomUUID())
    await router.push({ name: 'chat', params: { id: created.id }, state: { opening: created.opening_utterance } })
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Не удалось начать'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <main class="screen">
    <p class="muted">Шаг {{ step + 1 }} из {{ titles.length }} · {{ titles[step] }}</p>
    <h1>{{ card?.theme_title }}</h1>
    <p v-if="card" class="muted">{{ card.seat }}. {{ card.context }}</p>
    <p v-if="error" class="error">{{ error }}</p>

    <section v-if="step === 0" class="stack">
      <label class="field">Цель переговоров<textarea v-model="goal" required /></label>
    </section>

    <section v-else-if="step === 1" class="stack">
      <article v-for="(issue, index) in issues" :key="index" class="card stack">
        <label class="field">Условие
          <select v-model="issue.type_id">
            <option v-for="type in issueTypes" :key="type.id" :value="type.id">{{ type.name }}, {{ type.unit }}</option>
          </select>
        </label>
        <div class="row">
          <label class="field">Граница<input v-model.number="issue.reservation" type="number" :min="typeOf(issue.type_id)?.range[0]" :max="typeOf(issue.type_id)?.range[1]" /></label>
          <label class="field">Идеал<input v-model.number="issue.ideal" type="number" :min="typeOf(issue.type_id)?.range[0]" :max="typeOf(issue.type_id)?.range[1]" /></label>
        </div>
        <label class="field">Вес
          <select v-model="issue.weight">
            <option value="low">Низкий</option>
            <option value="medium">Средний</option>
            <option value="high">Высокий</option>
          </select>
        </label>
        <button v-if="issues.length > 2" class="btn danger" type="button" @click="issues.splice(index, 1)">Убрать</button>
      </article>
      <button v-if="issues.length < 4" class="btn ghost" type="button" @click="addIssue">Добавить условие</button>
    </section>

    <section v-else-if="step === 2" class="stack">
      <label class="field">Альтернатива (BATNA)<textarea v-model="batna" /></label>
      <label class="field">Заметка о собеседнике<textarea v-model="note" /></label>
      <label class="field">Свои ограничения<textarea v-model="constraints" /></label>
    </section>

    <section v-else class="stack">
      <button
        v-for="persona in personas"
        :key="persona.id"
        type="button"
        class="card"
        :style="personaId === persona.id ? 'outline: 2px solid var(--blue)' : ''"
        @click="personaId = persona.id"
      >
        <b>{{ persona.name }}</b>
        <p class="muted">{{ persona.tagline }}</p>
      </button>
      <div v-if="personaId === 'custom'" class="card stack">
        <p class="muted">Без карточки собеседник отвечает как Молчун. Импорт только заполняет форму — сохранение отдельно.</p>
        <label class="field">Имя<input v-model="profile.display_name" /></label>
        <label class="field">Роль<input v-model="profile.role" /></label>
        <label class="field">Обращение
          <select v-model="profile.address_form">
            <option value="formal">На вы</option>
            <option value="informal">На ты</option>
          </select>
        </label>
        <label class="field">Длина ответа
          <select v-model="profile.reply_length">
            <option value="short">Коротко</option>
            <option value="medium">Средне</option>
            <option value="long">Развёрнуто</option>
          </select>
        </label>
        <label class="field">Черты через запятую<input v-model="traitsText" /></label>
        <label class="field">Фразы, каждая с новой строки<textarea v-model="phrasesText" /></label>
        <div class="row">
          <input v-model="importId" placeholder="person_id" />
          <button class="btn ghost" type="button" @click="importProfile">Из Cognico</button>
        </div>
        <button class="btn ghost" type="button" @click="saveProfile">Сохранить карточку</button>
      </div>
    </section>

    <div class="row">
      <button v-if="step > 0" class="btn ghost" type="button" @click="step -= 1">Назад</button>
      <button v-if="step < 3" class="btn tg-hide" type="button" @click="step += 1">Далее</button>
      <button v-else class="btn tg-hide" type="button" :disabled="pending" @click="start">Начать</button>
    </div>
  </main>
</template>
