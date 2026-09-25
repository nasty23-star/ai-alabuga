<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import backIcon from '@/assets/onboarding/back.svg'
import { ApiError, explainApiError, getApi } from '@/api'
import { scenarioVariant } from '@/scenarios'
import { useSessionStore } from '@/stores/session'
import { useTelegramButtons } from '@/telegram'
import type { CounterpartProfile, IssueDraft, IssueType, Persona, ScenarioCard, ScenarioTheme, Weight } from '@/api/types'

const route = useRoute()
const router = useRouter()
const session = useSessionStore()
const scenarioId = computed(() => (typeof route.params.scenarioId === 'string' ? route.params.scenarioId : null))
const chosenId = ref<string | null>(scenarioId.value)
const themes = ref<ScenarioTheme[]>([])
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
const pickingPersona = ref(false)
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
    const [types, people, catalog] = await Promise.all([getApi().issueTypes(), getApi().personas(), getApi().scenarios()])
    issueTypes.value = types.items
    personas.value = people.items
    themes.value = catalog.themes
    if (scenarioId.value) await applyScenario(scenarioId.value, true)
    else if (types.items.length >= 2) {
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

function profileHint(): string {
  applyNameLine()
  const need: string[] = []
  if (!profile.display_name) need.push('имя')
  if (!profile.role) need.push('роль после запятой')
  if (profile.display_name.length > 64) need.push('имя не длиннее 64 символов')
  if (!need.length) return ''
  const example = !profile.display_name || !profile.role ? ' Пример: «Ирина, CFO».' : ''
  return `Нужно ещё: ${need.join(', ')}.${example}`
}

async function saveProfile() {
  error.value = ''
  const hint = profileHint()
  if (hint) {
    error.value = hint
    return
  }
  pending.value = true
  try {
    await getApi().putCounterpart({ ...profile })
    closeCustom()
    review.value = 'card'
  } catch (caught) {
    error.value = caught instanceof ApiError ? explainApiError(caught, 'Не удалось сохранить') : 'Не удалось сохранить'
  } finally {
    pending.value = false
  }
}

function closeWizard() {
  void router.push('/scenarios/pick')
}

function back() {
  if (step.value > 0) step.value -= 1
  else closeWizard()
}

function letters(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return (parts.slice(0, 2).map((part) => part[0]).join('') || 'С').toUpperCase()
}

const initials = computed(() => letters(profile.display_name))

const selectedPersona = computed(() => personas.value.find((persona) => persona.id === personaId.value))

const counterpartName = computed(() => (
  personaId.value === 'custom'
    ? (profile.display_name || 'Свой собеседник')
    : (selectedPersona.value?.name || 'Собеседник')
))

const counterpartRole = computed(() => (
  personaId.value === 'custom' ? profile.role : (selectedPersona.value?.tagline || '')
))

const counterpartInitials = computed(() => letters(counterpartName.value))

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

function changePersona() {
  pickingPersona.value = true
  customOpen.value = false
  review.value = null
  step.value = 3
}

function backToScenario() {
  pickingPersona.value = false
  customOpen.value = false
  review.value = 'scenario'
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
      main: { text: 'Начать общение', enabled: !pending.value, progress: pending.value, onClick: () => { void start() } },
      back: () => { review.value = 'card' },
    }
  }
  if (pickingPersona.value && !customOpen.value) {
    return {
      main: { text: 'К сценарию', onClick: backToScenario },
      back: backToScenario,
    }
  }
  return customOpen.value
  ? {
      main: { text: 'Сохранить собеседника', enabled: !pending.value, progress: pending.value, onClick: () => { void saveProfile() } },
      back: pickingPersona.value ? () => { customOpen.value = false } : closeCustom,
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

function startHint(): string {
  const need: string[] = []
  if (!chosenId.value) need.push('сценарий')
  if (!(goal.value || '').trim()) need.push('цель переговоров')
  if (!(batna.value || '').trim()) need.push('альтернативу — что будете делать, если не договоритесь')
  if (!need.length) return ''
  return `Нужно ещё указать: ${need.join(' и ')}`
}

async function applyScenario(id: string, replace: boolean) {
  error.value = ''
  const next = await getApi().scenario(id)
  chosenId.value = id
  card.value = next
  if (replace) {
    step.value = 0
    review.value = null
    pickingPersona.value = false
    customOpen.value = false
  }
  if (replace || !(goal.value || '').trim()) goal.value = next.defaults.goal || ''
  if (replace || !(batna.value || '').trim()) batna.value = next.defaults.batna?.text || ''
  if (replace || !issues.value.length) {
    issues.value = (next.defaults.issues ?? []).map((issue) => ({ ...issue }))
  }
}

async function chooseScenario(id: string | undefined, replace = false) {
  if (!id) return
  try {
    await applyScenario(id, replace)
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Не удалось открыть сценарий'
  }
}

watch(scenarioId, (id, previous) => {
  if (id && id !== previous) {
    void chooseScenario(id, true)
    return
  }
  if (!id && previous) {
    chosenId.value = null
    card.value = null
    step.value = 0
    review.value = null
  }
})

async function start() {
  error.value = ''
  const hint = startHint()
  if (hint) {
    error.value = hint
    return
  }
  pending.value = true
  try {
    if (personaId.value === 'custom' && profile.display_name.trim()) {
      applyNameLine()
      await getApi().putCounterpart({ ...profile })
    }
    const created = await getApi().startNegotiation({
      scenario_id: chosenId.value,
      persona_id: personaId.value,
      terms: {
        goal: (goal.value || '').trim(),
        issues: issues.value,
        batna: { text: (batna.value || '').trim() },
        counterpart_note: note.value.trim() || null,
        own_constraints: constraints.value.trim() || null,
      },
    }, crypto.randomUUID())
    await router.push({ name: 'chat', params: { id: created.id }, state: { opening: created.opening_utterance } })
  } catch (caught) {
    error.value = caught instanceof ApiError ? explainApiError(caught, 'Не удалось начать') : 'Не удалось начать'
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
    <section v-if="!chosenId" class="stack">
      <p class="muted">Выберите сценарий</p>
      <button v-for="theme in themes" :key="theme.theme" class="card" type="button" @click="chooseScenario(scenarioVariant(theme, session.account?.spheres ?? [])?.id, true)">
        <b>{{ theme.title }}</b>
        <p class="muted">{{ theme.tagline }}</p>
      </button>
    </section>
    <article v-else class="card check-card">
      <b class="check-title">{{ card?.theme_title || 'Свой сценарий' }}</b>
      <p v-if="card" class="muted">{{ card.seat }}</p>
      <label class="check-block check-edit">
        <span class="muted">Цель</span>
        <textarea v-model="goal" rows="2" placeholder="Чего хотите добиться" @input="error = ''" />
      </label>
      <div class="check-block">
        <span class="muted">Условия</span>
        <p v-for="issue in issues" :key="issue.type_id">
          <b>{{ typeOf(issue.type_id)?.name || issue.type_id }}</b>
          <span class="muted"> {{ issue.reservation }} → {{ issue.ideal }} {{ typeOf(issue.type_id)?.unit }}, вес {{ weightLabel[issue.weight] }}</span>
        </p>
      </div>
      <label class="check-block check-edit">
        <span class="muted">Альтернатива</span>
        <textarea v-model="batna" rows="2" placeholder="Что будете делать, если не договоритесь" @input="error = ''" />
      </label>
      <button class="check-person check-switch" type="button" @click="changePersona">
        <span class="check-avatar">{{ counterpartInitials }}</span>
        <span class="pick-copy">
          <span class="muted">Собеседник</span>
          <b>{{ counterpartName }}</b>
          <span v-if="counterpartRole" class="muted">{{ counterpartRole }}</span>
        </span>
        <span class="muted" aria-hidden="true">›</span>
      </button>
    </article>
    <button class="btn" type="button" :disabled="pending" @click="start">Начать общение</button>
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
    <header class="pick-head">
      <button class="back" type="button" @click="back"><img :src="backIcon" alt="" width="20" height="20" /></button>
      <b>Шаг {{ step + 1 }} из {{ titles.length }}</b>
      <button class="back" type="button" aria-label="Закрыть" @click="closeWizard">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
      </button>
    </header>
    <div class="step-bar" role="progressbar" :aria-valuenow="step + 1" aria-valuemin="1" :aria-valuemax="titles.length" :aria-label="`Шаг ${step + 1} из ${titles.length}`">
      <span :style="{ width: `${((step + 1) / titles.length) * 100}%` }" />
    </div>
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
      <button v-if="pickingPersona" class="btn" type="button" @click="backToScenario">К сценарию</button>
      <template v-else>
        <button v-if="step > 0" class="btn ghost" type="button" @click="step -= 1">Назад</button>
        <button v-if="step < 3" class="btn tg-hide" type="button" @click="step += 1">Далее</button>
        <button v-else class="btn tg-hide" type="button" :disabled="pending" @click="start">Начать</button>
      </template>
    </div>
  </main>
</template>
