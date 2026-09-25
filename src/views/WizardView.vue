<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import backIcon from '@/assets/onboarding/back.svg'
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
const customOpen = ref(false)
const review = ref<null | 'card' | 'scenario'>(null)
const nameLine = ref('')
const talkativeness = ref(15)
const phraseDraft = ref('')
const addingPhrase = ref(false)

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
    if (route.query.persona === 'custom') personaId.value = 'custom'
    const custom = people.items.find((item) => item.id === 'custom' && item.configured)
    if (custom) {
      const saved = await getApi().getCounterpart()
      applyProfile(saved)
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

function applyProfile(saved: CounterpartProfile) {
  Object.assign(profile, saved)
  nameLine.value = [saved.display_name, saved.role].filter(Boolean).join(', ')
  talkativeness.value = saved.reply_length === 'long' ? 100 : saved.reply_length === 'medium' ? 50 : 15
}

function openCustom() {
  personaId.value = 'custom'
  nameLine.value = [profile.display_name, profile.role].filter(Boolean).join(', ')
  customOpen.value = true
}

function closeCustom() {
  customOpen.value = false
  addingPhrase.value = false
}

function applyNameLine() {
  const [name, ...rest] = nameLine.value.split(',')
  profile.display_name = (name ?? '').trim()
  profile.role = rest.join(',').trim()
  profile.reply_length = talkativeness.value >= 66 ? 'long' : talkativeness.value >= 33 ? 'medium' : 'short'
}

function addPhrase() {
  const text = phraseDraft.value.trim()
  if (!text || profile.sample_phrases.length >= 5) return
  profile.sample_phrases.push(text)
  phraseDraft.value = ''
  addingPhrase.value = false
}

function removePhrase(index: number) {
  profile.sample_phrases.splice(index, 1)
}

async function importProfile() {
  error.value = ''
  try {
    applyProfile(await getApi().importCounterpart('irina'))
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Импорт недоступен'
  }
}

async function saveProfile() {
  error.value = ''
  pending.value = true
  try {
    applyNameLine()
    await getApi().putCounterpart({ ...profile })
    closeCustom()
    review.value = 'card'
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Не удалось сохранить'
  } finally {
    pending.value = false
  }
}

function back() {
  if (step.value > 0) step.value -= 1
  else void router.push(route.query.persona === 'custom' ? '/scenarios' : '/scenarios/pick')
}

const initials = computed(() => {
  const parts = profile.display_name.trim().split(/\s+/).filter(Boolean)
  return (parts.slice(0, 2).map((part) => part[0]).join('') || 'С').toUpperCase()
})

const styleLine = computed(() => {
  const tone = profile.formality >= 0.66 ? 'Жёсткий, спорит цифрами' : profile.formality >= 0.33 ? 'Держит позицию' : 'Мягкий'
  const talk = profile.reply_length === 'short' ? 'говорит коротко' : profile.reply_length === 'long' ? 'говорит развёрнуто' : 'говорит по делу'
  return `${tone}, ${talk}`
})

const weightLabel: Record<Weight, string> = { low: 'низкий', medium: 'средний', high: 'высокий' }

function editCard() {
  review.value = null
  openCustom()
}

useTelegramButtons(() => {
  if (review.value === 'card') {
    return {
      main: { text: 'Подтвердить собеседника', onClick: () => { review.value = 'scenario' } },
      back: editCard,
    }
  }
  if (review.value === 'scenario') {
    return {
      main: { text: 'Начать созвон', enabled: !pending.value, progress: pending.value, onClick: () => { void start() } },
      back: () => { review.value = 'card' },
    }
  }
  return customOpen.value
  ? {
      main: { text: 'Сохранить собеседника', enabled: !pending.value, progress: pending.value, onClick: () => { void saveProfile() } },
      back: closeCustom,
    }
  : {
      main: {
        text: step.value < 3 ? 'Далее' : 'Начать',
        enabled: !pending.value,
        progress: pending.value,
        onClick: () => { if (step.value < 3) step.value += 1; else void start() },
      },
      back,
    }
})

async function start() {
  error.value = ''
  pending.value = true
  try {
    if (personaId.value === 'custom' && profile.display_name.trim()) {
      applyNameLine()
      await getApi().putCounterpart({ ...profile })
    }
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
  <main v-if="review === 'card'" class="screen own">
    <header class="pick-head">
      <button class="back" type="button" @click="editCard"><img :src="backIcon" alt="" width="20" height="20" /></button>
      <b>Проверь карточку</b>
      <span />
    </header>
    <p v-if="profile.source === 'cognico'" class="check-badge">Собрано из Cognico</p>
    <article class="card check-card">
      <button class="check-person" type="button" @click="editCard">
        <span class="check-avatar">{{ initials }}</span>
        <span class="pick-copy">
          <b>{{ profile.display_name || 'Без имени' }}</b>
          <span class="muted">{{ profile.role || 'Собеседник' }}</span>
        </span>
        <span class="muted" aria-hidden="true">›</span>
      </button>
      <div class="check-block">
        <span class="muted">Стиль</span>
        <b>{{ styleLine }}</b>
      </div>
      <div v-if="profile.traits.length" class="check-block">
        <span class="muted">Что для него важно</span>
        <div class="own-chips">
          <span v-for="trait in profile.traits" :key="trait" class="check-tag">{{ trait }}</span>
        </div>
      </div>
      <div v-if="profile.sample_phrases.length" class="check-block">
        <span class="muted">Типичные возражения</span>
        <b>«{{ profile.sample_phrases.join('» · «') }}»</b>
      </div>
    </article>
    <p class="check-note">{{ profile.source === 'cognico' ? 'Источники: звонки и переписка. Поправь, если что-то не так.' : 'Карточка заполнена вручную. Поправь, если что-то не так.' }}</p>
    <button class="btn" type="button" @click="review = 'scenario'">Подтвердить собеседника</button>
    <button class="btn ghost" type="button" @click="editCard">Заполнить вручную</button>
  </main>

  <main v-else-if="review === 'scenario'" class="screen own">
    <header class="pick-head">
      <button class="back" type="button" @click="review = 'card'"><img :src="backIcon" alt="" width="20" height="20" /></button>
      <b>Проверь сценарий</b>
      <span />
    </header>
    <p v-if="error" class="error">{{ error }}</p>
    <article class="card check-card">
      <b class="check-title">{{ card?.theme_title || 'Свой сценарий' }}</b>
      <p v-if="card" class="muted">{{ card.seat }}</p>
      <div class="check-block">
        <span class="muted">Цель</span>
        <b>{{ goal.trim() || 'Не задана' }}</b>
      </div>
      <div class="check-block">
        <span class="muted">Условия</span>
        <p v-for="issue in issues" :key="issue.type_id">
          <b>{{ typeOf(issue.type_id)?.name || issue.type_id }}</b>
          <span class="muted"> {{ issue.reservation }} → {{ issue.ideal }} {{ typeOf(issue.type_id)?.unit }}, вес {{ weightLabel[issue.weight] }}</span>
        </p>
      </div>
      <div v-if="batna.trim()" class="check-block">
        <span class="muted">Альтернатива</span>
        <b>{{ batna.trim() }}</b>
      </div>
    </article>
    <button class="btn" type="button" :disabled="pending" @click="start">Начать созвон</button>
  </main>

  <main v-else-if="customOpen" class="screen own">
    <header class="pick-head">
      <button class="back" type="button" @click="closeCustom"><img :src="backIcon" alt="" width="20" height="20" /></button>
      <b>Свой собеседник</b>
      <span />
    </header>
    <p v-if="error" class="error">{{ error }}</p>
    <article class="card own-source">
      <span class="own-mark" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="3" y="2" width="12" height="14" rx="2" stroke="#1a5cff" stroke-width="1.6"/><path d="M6 6h6M6 9h6M6 12h4" stroke="#1a5cff" stroke-width="1.4" stroke-linecap="round"/></svg>
      </span>
      <span class="pick-copy">
        <b>Cognico</b>
        <span class="muted">Звонки и переписка</span>
      </span>
      <button class="own-pull" type="button" @click="importProfile">Подтянуть</button>
    </article>
    <label class="own-name">
      <input v-model="nameLine" placeholder="[Имя], CFO" />
    </label>
    <article class="card own-sliders">
      <label>
        <b>Жёсткость</b>
        <input v-model.number="profile.formality" type="range" min="0" max="1" step="0.01" :style="{ '--p': `${profile.formality * 100}%` }" />
        <span class="own-scale"><span>мягко</span><span>давит</span></span>
      </label>
      <label>
        <b>Разговорчивость</b>
        <input v-model.number="talkativeness" type="range" min="0" max="100" step="1" :style="{ '--p': `${talkativeness}%` }" />
        <span class="own-scale"><span>коротко</span><span>много слов</span></span>
      </label>
    </article>
    <section class="own-phrases">
      <b>Типичные возражения</b>
      <div class="own-chips">
        <button v-for="(phrase, index) in profile.sample_phrases" :key="`${phrase}-${index}`" type="button" class="own-chip" @click="removePhrase(index)">«{{ phrase }}»</button>
        <button v-if="!addingPhrase && profile.sample_phrases.length < 5" class="own-chip add" type="button" @click="addingPhrase = true">+ ещё</button>
      </div>
      <form v-if="addingPhrase" class="own-add" @submit.prevent="addPhrase">
        <input v-model="phraseDraft" placeholder="Возражение" maxlength="200" />
        <button class="own-pull" type="submit">Добавить</button>
      </form>
    </section>
    <button class="btn" type="button" :disabled="pending" @click="saveProfile">Сохранить собеседника</button>
  </main>

  <main v-else class="screen">
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
        @click="persona.id === 'custom' ? openCustom() : (personaId = persona.id)"
      >
        <b>{{ persona.name }}</b>
        <p class="muted">{{ persona.tagline }}</p>
      </button>
    </section>

    <div class="row">
      <button v-if="step > 0" class="btn ghost" type="button" @click="step -= 1">Назад</button>
      <button v-if="step < 3" class="btn tg-hide" type="button" @click="step += 1">Далее</button>
      <button v-else class="btn tg-hide" type="button" :disabled="pending" @click="start">Начать</button>
    </div>
  </main>
</template>
