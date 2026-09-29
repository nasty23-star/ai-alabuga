<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import backIcon from '@/assets/onboarding/back.svg'
import chevron from '@/assets/onboarding/chevron.svg'
import personaSpark from '@/assets/onboarding/persona-spark.svg'
import personaCpo from '@/assets/onboarding/persona-toxic-cpo.png'
import personaCeo from '@/assets/onboarding/persona-busy-ceo.png'
import mountains from '@/assets/onboarding/mountains.png'
import { ApiError, cognicoProblem, explainApiError, getApi } from '@/api'
import { clearCounterpartDraft, readCounterpartDraft, saveCounterpartDraft, type CounterpartDraft } from '@/cognico'
import { scenarioIcon } from '@/scenarioIcons'
import { scenarioVariant } from '@/scenarios'
import { copyProfile, useCounterpartStore } from '@/stores/counterpart'
import { useSessionStore } from '@/stores/session'
import { useTrainingsStore } from '@/stores/trainings'
import { useTelegramButtons } from '@/telegram'
import type { CognicoRecording, CounterpartProfile, IssueDraft, IssueType, Persona, ScenarioCard, ScenarioTheme, Weight } from '@/api/types'

const route = useRoute()
const router = useRouter()
const session = useSessionStore()
const trainings = useTrainingsStore()
const counterpart = useCounterpartStore()
const cachedProfile = counterpart.profile ? copyProfile(counterpart.profile) : null
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
const profile = reactive<CounterpartProfile>(cachedProfile ?? {
  display_name: '',
  role: '',
  address_form: 'formal',
  reply_length: 'short',
  formality: 0.7,
  traits: [],
  sample_phrases: [],
  source: 'manual',
})
const customOpen = ref(route.query.persona === 'custom')
const manualOpen = ref(false)
const recordingsOpen = ref(false)
const review = ref<null | 'card' | 'scenario'>(null)
const pickingPersona = ref(false)
const nameLine = ref(cachedProfile ? [cachedProfile.display_name, cachedProfile.role].filter(Boolean).join(', ') : '')
const talkativeness = ref(cachedProfile?.reply_length === 'long' ? 100 : cachedProfile?.reply_length === 'medium' ? 50 : 15)
const phraseDraft = ref('')
const addingPhrase = ref(false)
const cognicoConnected = ref(counterpart.cognicoConnected === true)
const cognicoKnown = ref(counterpart.cognicoConnected != null)
const cognicoNotice = ref('')
const recordings = ref<CognicoRecording[]>([])
const recordingsLoading = ref(false)
const recordingQuery = ref('')
const selectedRecordingId = ref('')
const speakerName = ref('')
const importing = ref(false)

const titles = ['Цель', 'Условия сделки', 'Если не договоритесь?', 'Что известно?', 'С кем говорим?', 'Проверь сценарий']
const editingFromReview = ref(false)
const weights: { id: Weight; label: string }[] = [
  { id: 'low', label: 'низкая' },
  { id: 'medium', label: 'средняя' },
  { id: 'high', label: 'высокая' },
]

function typeOf(id: string) {
  return issueTypes.value.find((item) => item.id === id)
}

onMounted(async () => {
  const openingCustom = route.query.persona === 'custom'
  const stamp = formStamp()
  if (openingCustom) {
    personaId.value = 'custom'
    customOpen.value = true
    void loadCognico()
  }
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
    const draft = openingCustom ? readCounterpartDraft() : null
    const custom = people.items.find((item) => item.id === 'custom' && item.configured)
    if ((custom || cachedProfile) && !draft) {
      try {
        const saved = await getApi().getCounterpart()
        if (formStamp() === stamp) applyProfile(saved)
      } catch {
        // На экране остаётся карточка из локального хранилища.
      }
    }
    if (draft) {
      applyDraft(draft)
      if (draft.wizard.scenarioId && card.value?.id !== draft.wizard.scenarioId) {
        try {
          await applyScenario(draft.wizard.scenarioId, false)
        } catch {
          // Сценарий подтянется ещё раз на шаге проверки.
        }
      }
    }
    if (openingCustom) {
      personaId.value = 'custom'
      customOpen.value = true
    }
    const flag = route.query.cognico
    if (flag === 'connected') cognicoNotice.value = 'CogniCo подключён'
    else if (flag === 'error') cognicoNotice.value = 'Не получилось'
    if (typeof flag === 'string') {
      const query = { ...route.query }
      delete query.cognico
      await router.replace({ query })
    }
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Не удалось открыть визард'
  }
})

function unitLabel(unit: string | undefined) {
  if (!unit) return ''
  return unit === '%' || unit.startsWith('₽') ? unit : ` ${unit}`
}

function typeChoices(current: string) {
  const used = new Set(issues.value.map((issue) => issue.type_id))
  return issueTypes.value.filter((type) => type.id === current || !used.has(type.id))
}

function onIssueType(issue: IssueDraft) {
  const type = typeOf(issue.type_id)
  if (!type) return
  const [min, max] = type.range
  const inside = issue.reservation >= min && issue.reservation <= max && issue.ideal >= min && issue.ideal <= max
  if (inside && issue.reservation !== issue.ideal) return
  issue.reservation = min
  issue.ideal = Math.min(max, min + 1)
}

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

function issuesHint(): string {
  if (issues.value.length < 2) return 'Нужно хотя бы два условия'
  if (issues.value.length > 4) return 'Не больше четырёх условий'
  const seen = new Set<string>()
  for (const issue of issues.value) {
    const type = typeOf(issue.type_id)
    if (!type) return 'Неизвестное условие'
    if (seen.has(issue.type_id)) return 'Каждое условие можно указать только один раз'
    seen.add(issue.type_id)
    if (!Number.isFinite(issue.reservation) || !Number.isFinite(issue.ideal)) return `У «${type.name}» укажите границу и идеал`
    if (issue.reservation === issue.ideal) return `У «${type.name}» граница и идеал не должны совпадать`
    const [min, max] = type.range
    if (issue.reservation < min || issue.reservation > max || issue.ideal < min || issue.ideal > max) {
      return `У «${type.name}» значения должны быть от ${min} до ${max}`
    }
  }
  return ''
}

function applyProfile(saved: CounterpartProfile) {
  const next = copyProfile(saved)
  Object.assign(profile, next)
  nameLine.value = [next.display_name, next.role].filter(Boolean).join(', ')
  talkativeness.value = next.reply_length === 'long' ? 100 : next.reply_length === 'medium' ? 50 : 15
  counterpart.remember(next)
}

function formStamp() {
  return JSON.stringify({
    name: nameLine.value,
    formality: profile.formality,
    talk: talkativeness.value,
    phrases: profile.sample_phrases,
    traits: profile.traits,
  })
}

function rememberForm() {
  applyNameLine()
  counterpart.remember(copyProfile(profile))
}

function openCustom() {
  personaId.value = 'custom'
  nameLine.value = [profile.display_name, profile.role].filter(Boolean).join(', ')
  manualOpen.value = false
  recordingsOpen.value = false
  review.value = null
  customOpen.value = true
  error.value = ''
  void loadCognico()
}

function currentDraft(): CounterpartDraft {
  applyNameLine()
  return {
    nameLine: nameLine.value,
    formality: profile.formality,
    talkativeness: talkativeness.value,
    phrases: [...profile.sample_phrases],
    traits: [...profile.traits],
    displayName: profile.display_name,
    role: profile.role,
    source: profile.source,
    addressForm: profile.address_form,
    replyLength: profile.reply_length,
    wizard: {
      scenarioId: chosenId.value,
      goal: goal.value,
      batna: batna.value,
      note: note.value,
      constraints: constraints.value,
      issues: issues.value.map((issue) => ({ ...issue })),
      personaId: personaId.value,
    },
  }
}

function applyDraft(draft: CounterpartDraft) {
  nameLine.value = draft.nameLine
  profile.display_name = draft.displayName
  profile.role = draft.role
  profile.formality = draft.formality
  profile.traits = [...draft.traits]
  profile.sample_phrases = [...draft.phrases]
  profile.source = draft.source
  profile.address_form = draft.addressForm
  profile.reply_length = draft.replyLength
  talkativeness.value = draft.talkativeness
  goal.value = draft.wizard.goal
  batna.value = draft.wizard.batna
  note.value = draft.wizard.note
  constraints.value = draft.wizard.constraints
  issues.value = draft.wizard.issues.map((issue) => ({ ...issue }))
  personaId.value = draft.wizard.personaId || 'custom'
  if (draft.wizard.scenarioId) chosenId.value = draft.wizard.scenarioId
}

const openingDraft = route.query.persona === 'custom' ? readCounterpartDraft() : null
if (openingDraft) applyDraft(openingDraft)

async function loadCognico() {
  try {
    const connected = (await getApi().cognicoStatus()).connected
    cognicoConnected.value = connected
    counterpart.rememberCognico(connected)
  } catch (caught) {
    const problem = cognicoProblem(caught)
    if (problem.kind === 'disconnected' || counterpart.cognicoConnected == null) {
      cognicoConnected.value = false
      counterpart.rememberCognico(false)
    }
    if (problem.kind !== 'disconnected') error.value = problem.kind === 'other' ? 'Не удалось проверить CogniCo' : problem.message
  } finally {
    cognicoKnown.value = true
  }
}

function noteCognicoProblem(caught: unknown) {
  const problem = cognicoProblem(caught)
  error.value = problem.message
  if (problem.kind === 'disconnected') {
    cognicoConnected.value = false
    counterpart.rememberCognico(false)
    recordingsOpen.value = false
  }
  if (problem.kind === 'unavailable') recordingsOpen.value = false
}

async function connectCognico() {
  error.value = ''
  cognicoNotice.value = ''
  pending.value = true
  try {
    saveCounterpartDraft(currentDraft())
    const { url } = await getApi().connectCognico()
    window.location.assign(url)
  } catch (caught) {
    noteCognicoProblem(caught)
    pending.value = false
  }
}

async function disconnectCognico() {
  error.value = ''
  pending.value = true
  try {
    await getApi().disconnectCognico()
    cognicoConnected.value = false
    counterpart.rememberCognico(false)
  } catch (caught) {
    noteCognicoProblem(caught)
  } finally {
    pending.value = false
  }
}

async function openRecordings() {
  error.value = ''
  cognicoNotice.value = ''
  recordingsOpen.value = true
  recordingsLoading.value = true
  recordingQuery.value = ''
  selectedRecordingId.value = ''
  speakerName.value = ''
  try {
    const page = await getApi().cognicoRecordings()
    recordings.value = [...page.items].sort((a, b) => b.recorded_at.localeCompare(a.recorded_at))
  } catch (caught) {
    noteCognicoProblem(caught)
  } finally {
    recordingsLoading.value = false
  }
}

async function pullRecording() {
  if (!selectedRecordingId.value) {
    error.value = 'Выберите встречу'
    return
  }
  error.value = ''
  importing.value = true
  try {
    applyProfile(await getApi().importCounterpart({
      recording_id: selectedRecordingId.value,
      speaker_name: speakerName.value.trim() || undefined,
    }))
    recordingsOpen.value = false
  } catch (caught) {
    noteCognicoProblem(caught)
  } finally {
    importing.value = false
  }
}

function closeRecordings() {
  recordingsOpen.value = false
  error.value = ''
}

function meetingDate(value: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
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
    rememberForm()
    clearCounterpartDraft()
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
const personaRows = computed(() => [
  ...personas.value.filter((persona) => persona.id === 'custom'),
  ...personas.value.filter((persona) => persona.id !== 'custom'),
])
const personaAvatars: Record<string, string> = {
  toxic_cpo: personaCpo,
  busy_ceo: personaCeo,
}

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
  const talk = talkativeness.value >= 66 ? 'говорит развёрнуто' : talkativeness.value >= 33 ? 'говорит по делу' : 'говорит коротко'
  return `${tone}, ${talk}`
})

const visibleRecordings = computed(() => {
  const query = recordingQuery.value.trim().toLowerCase()
  if (!query) return recordings.value
  return recordings.value.filter((item) => item.title.toLowerCase().includes(query) || meetingDate(item.recorded_at).toLowerCase().includes(query))
})

const weightLabel: Record<Weight, string> = { low: 'низкий', medium: 'средний', high: 'высокий' }

function editCard() {
  review.value = null
  manualOpen.value = false
  openCustom()
}

function openManual() {
  manualOpen.value = true
  error.value = ''
  addingPhrase.value = false
}

async function confirmCounterpart() {
  error.value = ''
  const hint = profileHint()
  if (hint) {
    error.value = hint
    return
  }
  pending.value = true
  try {
    await getApi().putCounterpart({ ...profile })
    rememberForm()
    clearCounterpartDraft()
    personaId.value = 'custom'
    manualOpen.value = false
    customOpen.value = false
    recordingsOpen.value = false
    review.value = null
    editingFromReview.value = false
    step.value = titles.length - 1
  } catch (caught) {
    error.value = caught instanceof ApiError ? explainApiError(caught, 'Не удалось сохранить') : 'Не удалось сохранить'
  } finally {
    pending.value = false
  }
}

function changePersona() {
  pickingPersona.value = true
  customOpen.value = false
  review.value = null
  editingFromReview.value = false
  step.value = titles.indexOf('Собеседник')
}

function editFromReview(index: number) {
  error.value = ''
  editingFromReview.value = true
  step.value = index
}

const issuesLine = computed(() => issues.value.map((issue, index) => {
  const type = typeOf(issue.type_id)
  const name = type?.name ?? issue.type_id
  const label = index === 0 ? name : name.toLowerCase()
  return `${label} ${issue.reservation}–${issue.ideal}${unitLabel(type?.unit)}`
}).join(' · '))

function backToScenario() {
  pickingPersona.value = false
  customOpen.value = false
  review.value = 'scenario'
}

useTelegramButtons(() => {
  if (recordingsOpen.value) {
    return {
      main: { text: 'Собрать карточку', enabled: !importing.value && Boolean(selectedRecordingId.value), progress: importing.value, onClick: () => { void pullRecording() } },
      back: closeRecordings,
    }
  }
  if (manualOpen.value) {
    return {
      main: { text: 'Подтвердить собеседника', enabled: !pending.value, progress: pending.value, onClick: () => { void confirmCounterpart() } },
      back: () => { manualOpen.value = false },
    }
  }
  if (review.value === 'card') {
    return {
      main: { text: 'Подтвердить собеседника', enabled: !pending.value, progress: pending.value, onClick: () => { void confirmCounterpart() } },
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
        text: step.value < titles.length - 1 ? (editingFromReview.value ? 'К проверке' : 'Далее') : 'Начать переговоры',
        enabled: !pending.value,
        progress: pending.value,
        onClick: nextStep,
      },
      back,
    }
})

function startHint(): string {
  if (!(goal.value || '').trim()) return 'Нужно указать цель переговоров'
  const issuesProblem = issuesHint()
  if (issuesProblem) return issuesProblem
  if (!(batna.value || '').trim()) return 'Нужно указать, что будете делать, если не договоритесь'
  return ''
}

function nextStep() {
  error.value = ''
  if (step.value === 1) {
    const hint = issuesHint()
    if (hint) {
      error.value = hint
      return
    }
  }
  if (editingFromReview.value) {
    editingFromReview.value = false
    step.value = titles.length - 1
    return
  }
  if (step.value < titles.length - 1) step.value += 1
  else void start()
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
    if (route.query.persona !== 'custom') customOpen.value = false
    editingFromReview.value = false
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

watch(() => route.query.persona, (value, previous) => {
  if (value === 'custom' && value !== previous) {
    const draft = readCounterpartDraft()
    if (draft) applyDraft(draft)
    openCustom()
  }
})

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
      rememberForm()
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
    void trainings.refresh().catch(() => {})
    await router.push({ name: 'chat', params: { id: created.id }, state: { opening: created.opening_utterance } })
  } catch (caught) {
    error.value = caught instanceof ApiError ? explainApiError(caught, 'Не удалось начать') : 'Не удалось начать'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <main v-if="recordingsOpen" class="screen own">
    <header class="pick-head">
      <button class="back" type="button" @click="closeRecordings"><img :src="backIcon" alt="" width="20" height="20" /></button>
      <b>Встречи</b>
      <span />
    </header>
    <p v-if="error" class="error">{{ error }}</p>
    <div v-if="importing" class="own-loading" role="status">
      <span class="own-spinner" aria-hidden="true" />
      <b>Собираем карточку</b>
      <span class="muted">Это займёт несколько секунд</span>
    </div>
    <template v-else>
      <p v-if="recordingsLoading" class="muted">Загружаем встречи…</p>
      <template v-else>
        <label class="own-name">
          <input v-model="recordingQuery" type="search" placeholder="Поиск по названию" aria-label="Поиск по встречам" />
        </label>
        <div class="meet-list">
          <button
            v-for="item in visibleRecordings"
            :key="item.id"
            type="button"
            class="meet"
            :class="{ 'is-on': selectedRecordingId === item.id }"
            @click="selectedRecordingId = item.id; error = ''"
          >
            <span>
              <b>{{ item.title }}</b>
              <span v-if="meetingDate(item.recorded_at)" class="muted">{{ meetingDate(item.recorded_at) }}</span>
            </span>
          </button>
          <p v-if="!visibleRecordings.length" class="muted">{{ error ? 'Не удалось показать встречи' : 'Ничего не нашлось' }}</p>
        </div>
        <label v-if="selectedRecordingId" class="own-name">
          <input v-model="speakerName" placeholder="Имя, как в расшифровке" aria-label="Кто на записи ваш собеседник" />
        </label>
        <p v-if="selectedRecordingId" class="check-note">Необязательно: кто на этой встрече ваш собеседник</p>
        <button class="btn" type="button" :disabled="!selectedRecordingId" @click="pullRecording">Собрать карточку</button>
      </template>
    </template>
  </main>

  <main v-else-if="manualOpen" class="screen own bare">
    <header class="pick-head">
      <button class="back" type="button" @click="manualOpen = false"><img :src="backIcon" alt="" width="20" height="20" /></button>
      <b>Проверь карточку</b>
      <span />
    </header>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="profile.source === 'cognico'" class="check-badge">Собрано из Cognico</p>
    <article class="card check-card">
      <div class="check-person">
        <span class="check-avatar">{{ initials }}</span>
        <span class="pick-copy">
          <b>{{ profile.display_name || 'Без имени' }}</b>
          <span class="muted">{{ profile.role || 'Собеседник' }}</span>
        </span>
      </div>
      <div class="check-block">
        <span class="muted">Стиль</span>
        <b class="check-style">{{ styleLine }}</b>
        <div class="own-sliders own-sliders-plain">
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
        </div>
      </div>
      <div v-if="profile.traits.length" class="check-block">
        <span class="muted">Что для него важно</span>
        <div class="own-chips">
          <span v-for="trait in profile.traits" :key="trait" class="check-tag">{{ trait }}</span>
        </div>
      </div>
      <div class="check-block">
        <span class="muted">Типичные возражения</span>
        <div class="own-chips">
          <button v-for="(phrase, index) in profile.sample_phrases" :key="`${phrase}-${index}`" type="button" class="own-chip" @click="removePhrase(index)">«{{ phrase }}»</button>
          <button v-if="!addingPhrase && profile.sample_phrases.length < 5" class="own-chip add" type="button" @click="addingPhrase = true">+ ещё</button>
        </div>
        <form v-if="addingPhrase" class="own-add" @submit.prevent="addPhrase">
          <input v-model="phraseDraft" placeholder="Возражение" maxlength="200" />
          <button class="own-pull" type="submit">Добавить</button>
        </form>
      </div>
    </article>
    <p class="check-note">{{ profile.source === 'cognico' ? 'Источники: звонки и документы. Поправь, если что-то не так.' : 'Карточка заполнена вручную. Поправь, если что-то не так.' }}</p>
    <button class="btn" type="button" :disabled="pending" @click="confirmCounterpart">Подтвердить собеседника</button>
  </main>

  <main v-else-if="review === 'card'" class="screen own bare">
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
    <p class="check-note">{{ profile.source === 'cognico' ? 'Источники: звонки и документы. Поправь, если что-то не так.' : 'Карточка заполнена вручную. Поправь, если что-то не так.' }}</p>
    <button class="btn" type="button" :disabled="pending" @click="confirmCounterpart">Подтвердить собеседника</button>
    <button class="btn ghost" type="button" @click="openManual">Заполнить вручную</button>
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

  <main v-else-if="customOpen" class="screen own bare">
    <header class="pick-head">
      <button class="back" type="button" @click="closeCustom"><img :src="backIcon" alt="" width="20" height="20" /></button>
      <b>Свой собеседник</b>
      <span />
    </header>
    <p v-if="cognicoNotice" class="own-notice" :class="{ 'is-bad': cognicoNotice === 'Не получилось' }">{{ cognicoNotice }}</p>
    <p v-if="error" class="error">{{ error }}</p>
    <article class="card own-source">
      <span class="own-mark" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="3" y="2" width="12" height="14" rx="2" stroke="#1a5cff" stroke-width="1.6"/><path d="M6 6h6M6 9h6M6 12h4" stroke="#1a5cff" stroke-width="1.4" stroke-linecap="round"/></svg>
      </span>
      <span class="pick-copy">
        <b>Cognico</b>
        <span class="muted">{{ cognicoConnected ? 'Звонки и переписка' : (cognicoKnown ? 'Не подключено' : 'Проверяем подключение…') }}</span>
        <button v-if="cognicoConnected" class="own-disconnect" type="button" :disabled="pending" @click="disconnectCognico">Отключить</button>
      </span>
      <button v-if="cognicoConnected" class="own-pull" type="button" :disabled="pending" @click="openRecordings">Подтянуть</button>
      <button v-else class="own-pull is-connect" type="button" :disabled="pending || !cognicoKnown" @click="connectCognico">Подключить CogniCo</button>
    </article>
    <label class="own-name">
      <input v-model="nameLine" placeholder="[Имя], CFO" />
    </label>
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
    <div class="btn-actions">
      <button class="btn" type="button" :disabled="pending" @click="saveProfile">Сохранить собеседника</button>
    </div>
  </main>

  <main v-else class="screen bare scenario">
    <header class="header-sticky">
    <div class="pick-head">
      <button class="back" type="button" @click="back"><img :src="backIcon" alt="" width="20" height="20" /></button>
      <b>Шаг {{ step + 1 }} из {{ titles.length }}</b>
      <button class="back" type="button" aria-label="Закрыть" @click="closeWizard">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
      </button>
    </div>
    <div class="step-bar" role="progressbar" :aria-valuenow="step + 1" aria-valuemin="1" :aria-valuemax="titles.length" :aria-label="`Шаг ${step + 1} из ${titles.length}`">
      <span v-for="(title, index) in titles" :key="title" :class="{ 'is-on': index <= step }" />
    </div>
    </header>
    <h1>{{ titles[step] }}</h1>
    <div v-if="step === 0 && card" class="wizard-scenario">
      <span class="pick-icon" :style="{ background: scenarioIcon(card.theme).bg, color: scenarioIcon(card.theme).color }" v-html="scenarioIcon(card.theme).svg" />
      <span class="pick-copy">
        <span class="muted">Сценарий</span>
        <b>{{ card.theme_title }}</b>
      </span>
      <button class="wizard-switch" type="button" @click="closeWizard">Сменить</button>
    </div>
    <p v-if="step === 2" class="muted">Твой план Б. Ниже него соглашаться нет смысла.</p>
    <p v-if="error" class="error">{{ error }}</p>

    <section v-if="step === 0" class="stack">
      <label class="field wizard-goal" for="negotiation-goal">Цель одной фразой<textarea id="negotiation-goal" name="goal" v-model="goal" required placeholder="Опишите цель переговоров одной фразой" /></label>
    <img class="bg-peaks" :src="mountains" alt="" />
    </section>

    <section v-else-if="step === 1" class="stack" style="display: grid; gap: 16px;">
      <article v-for="(issue, index) in issues" :key="index" class="deal-card">
        <div class="deal-head">
          <select class="deal-title" :name="`issue-type-${index}`" v-model="issue.type_id" @change="onIssueType(issue)">
            <option v-for="type in typeChoices(issue.type_id)" :key="type.id" :value="type.id">{{ type.name }}</option>
          </select>
          <button v-if="issues.length > 2" class="wizard-switch" type="button" @click="issues.splice(index, 1)">Убрать</button>
        </div>
        <div class="deal-pair">
          <label :for="`reservation-${index}`">Граница
            <span class="deal-input">
              <input :id="`reservation-${index}`" :name="`reservation-${index}`" v-model.number="issue.reservation" type="number" inputmode="numeric" :min="typeOf(issue.type_id)?.range[0]" :max="typeOf(issue.type_id)?.range[1]" />
              <span>{{ unitLabel(typeOf(issue.type_id)?.unit) }}</span>
            </span>
          </label>
          <label :for="`ideal-${index}`">Идеал
            <span class="deal-input">
              <input :id="`ideal-${index}`" :name="`ideal-${index}`" v-model.number="issue.ideal" type="number" inputmode="numeric" :min="typeOf(issue.type_id)?.range[0]" :max="typeOf(issue.type_id)?.range[1]" />
              <span>{{ unitLabel(typeOf(issue.type_id)?.unit) }}</span>
            </span>
          </label>
        </div>
        <div class="deal-weight">
          <span>Важность</span>
          <div class="deal-pills">
            <button v-for="item in weights" :key="item.id" type="button" :class="{ on: issue.weight === item.id }" @click="issue.weight = item.id">{{ item.label }}</button>
          </div>
        </div>
      </article>
      <button v-if="issues.length < 4" class="btn ghost" type="button" @click="addIssue">Добавить условие</button>
    </section>

    <section v-else-if="step === 2" class="stack">
      <label class="field wizard-goal"><textarea id="batna" name="batna" v-model="batna" required placeholder="Что будете делать, если не договоритесь" aria-label="План Б" /></label>
    </section>

    <section v-else-if="step === 3" class="stack">
      <label class="field wizard-goal" for="counterpart-note">О собеседнике<textarea id="counterpart-note" name="counterpart_note" v-model="note" placeholder="Что уже известно о собеседнике" /></label>
      <label class="field wizard-goal" for="own-constraints">Твои ограничения<textarea id="own-constraints" name="own_constraints" v-model="constraints" placeholder="Чего нельзя нарушить" /></label>
     <img class="bg-peaks-restrictions" :src="mountains" alt="" />
    </section>

    <section v-else-if="step === 4" class="persona-list">
      <button
        v-for="persona in personaRows"
        :key="persona.id"
        type="button"
        class="card persona-card"
        :class="{ 'is-custom': persona.id === 'custom', 'is-on': persona.id !== 'custom' && personaId === persona.id }"
        @click="persona.id === 'custom' ? openCustom() : (personaId = persona.id)"
      >
        <span v-if="persona.id === 'custom'" class="home-own-icon" aria-hidden="true">
          <img :src="personaSpark" alt="" width="22" height="22" />
        </span>
        <img v-else-if="personaAvatars[persona.id]" class="persona-avatar" :src="personaAvatars[persona.id]" alt="" width="44" height="44" />
        <span v-else class="persona-avatar persona-fallback" aria-hidden="true">{{ letters(persona.name) }}</span>
        <span class="persona-copy">
          <b>{{ persona.name }}</b>
          <span class="muted">{{ persona.tagline }}</span>
        </span>
        <img v-if="persona.id === 'custom'" :src="chevron" alt="" width="20" height="22" />
        <svg v-else-if="personaId === persona.id" class="persona-mark" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="11" fill="#1a5cff" />
          <path d="M7.4 12.2 10.4 15.2 16.6 8.8" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <svg v-else class="persona-mark" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9.2" stroke="#D4D4D8" stroke-width="1.6" />
        </svg>
      </button>
    </section>

    <section v-else class="scenario-review">
      <button class="review-row" type="button" @click="editFromReview(0)">
        <span>
          <span class="muted">Цель</span>
          <b>{{ goal || 'Не указана' }}</b>
        </span>
        <span class="review-edit">Изм.</span>
      </button>
      <button class="review-row" type="button" @click="editFromReview(1)">
        <span>
          <span class="muted">Условия</span>
          <b>{{ issuesLine || 'Не заданы' }}</b>
        </span>
        <span class="review-edit">Изм.</span>
      </button>
      <button class="review-row" type="button" @click="editFromReview(2)">
        <span>
          <span class="muted">План Б</span>
          <b>{{ batna || 'Не указан' }}</b>
        </span>
        <span class="review-edit">Изм.</span>
      </button>
      <button class="review-row" type="button" @click="editFromReview(4)">
        <span>
          <span class="muted">Собеседник</span>
          <b>{{ counterpartName }}</b>
        </span>
        <span class="review-edit">Изм.</span>
      </button>
    </section>

    <div class="row btn-actions">
      <button v-if="step < titles.length - 1" class="btn tg-hide" type="button" @click="nextStep">{{ editingFromReview ? 'К проверке' : 'Далее' }}</button>
      <button v-else class="btn tg-hide" type="button" :disabled="pending" @click="start">Начать общение</button>
    </div>
  </main>
</template>
