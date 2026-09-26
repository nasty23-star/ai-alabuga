import { fail } from './errors'
import type { Api } from './http'
import type {
  Account,
  AgreedTerm,
  CounterpartProfile,
  Debrief,
  IssueDraft,
  IssueType,
  NegotiationStatus,
  NegotiationCreated,
  NegotiationListItem,
  NegotiationState,
  Outcome,
  Persona,
  ScenarioCard,
  ScenariosResponse,
  SharedResult,
  SphereId,
  Terms,
  TurnEvent,
  TurnReplay,
} from './types'

const ISSUE_TYPES: IssueType[] = [
  { id: 'price', name: 'Цена', unit: '₽', range: [0, 100_000_000] },
  { id: 'discount', name: 'Скидка', unit: '%', range: [0, 50] },
  { id: 'volume', name: 'Объём', unit: 'шт', range: [0, 100_000] },
  { id: 'payment_days', name: 'Срок оплаты', unit: 'дней', range: [0, 120] },
  { id: 'delivery_days', name: 'Срок поставки', unit: 'дней', range: [1, 180] },
  { id: 'contract_months', name: 'Срок контракта', unit: 'мес', range: [1, 60] },
  { id: 'warranty_months', name: 'Гарантия', unit: 'мес', range: [0, 60] },
  { id: 'sla_hours', name: 'Время реакции', unit: 'ч', range: [1, 168] },
  { id: 'budget', name: 'Бюджет', unit: '₽', range: [0, 100_000_000] },
  { id: 'headcount', name: 'Людей в команде', unit: 'чел', range: [0, 200] },
  { id: 'salary', name: 'Зарплата', unit: '₽/мес', range: [0, 1_000_000] },
  { id: 'bonus_percent', name: 'Премия', unit: '%', range: [0, 100] },
  { id: 'review_months', name: 'Пересмотр через', unit: 'мес', range: [1, 24] },
]

const SPHERES: { id: SphereId; title: string }[] = [
  { id: 'procurement', title: 'Закупки' },
  { id: 'sales', title: 'Продажи' },
  { id: 'hiring', title: 'Найм' },
  { id: 'management', title: 'Управление' },
  { id: 'founder', title: 'Основатель' },
]

const SEATS: Record<SphereId, string> = {
  procurement: 'Вы закупаете',
  sales: 'У вас просят',
  hiring: 'Вы нанимаете',
  management: 'Вы руководите',
  founder: 'Вы основатель',
}

interface ThemeSeed {
  theme: string
  title: string
  tagline: string
  context: string
  hook: string
  player: string
  counterpart: string
  goal: string
  issues: IssueDraft[]
}

const THEMES: ThemeSeed[] = [
  {
    theme: 'order_placement',
    title: 'Размещение заказа',
    tagline: 'Новый заказ и условия поставки',
    context: 'Вы готовите первый заказ и хотите зафиксировать цену, срок и объём.',
    hook: 'Поставщик открыл встречу вопросом, что именно вы готовы заказать.',
    player: 'Менеджер по закупкам',
    counterpart: 'Менеджер поставщика',
    goal: 'Выгодная цена и короткий срок поставки',
    issues: [
      { type_id: 'price', reservation: 1_200_000, ideal: 900_000, weight: 'high' },
      { type_id: 'delivery_days', reservation: 21, ideal: 10, weight: 'medium' },
    ],
  },
  {
    theme: 'contractor_discount',
    title: 'Скидка у подрядчика',
    tagline: 'Скидка на новый контракт',
    context: 'Вы — менеджер по закупкам и просите скидку на новый контракт.',
    hook: 'Вы просили встречу по новому контракту.',
    player: 'Менеджер по закупкам',
    counterpart: 'Директор по закупкам «Стройбазы»',
    goal: 'Скидка и длинный срок оплаты',
    issues: [
      { type_id: 'discount', reservation: 5, ideal: 15, weight: 'high' },
      { type_id: 'payment_days', reservation: 30, ideal: 60, weight: 'medium' },
    ],
  },
  {
    theme: 'salary_raise',
    title: 'Повышение зарплаты',
    tagline: 'Разговор о доходе и премии',
    context: 'Вы обсуждаете пересмотр дохода после сильного квартала.',
    hook: 'Руководитель спросил, с какой цифры вы начинаете.',
    player: 'Специалист',
    counterpart: 'Руководитель',
    goal: 'Рост зарплаты без потери премии',
    issues: [
      { type_id: 'salary', reservation: 180_000, ideal: 240_000, weight: 'high' },
      { type_id: 'bonus_percent', reservation: 10, ideal: 20, weight: 'medium' },
    ],
  },
  {
    theme: 'contract_renewal',
    title: 'Продление контракта',
    tagline: 'Срок, гарантия и оплата',
    context: 'Контракт заканчивается, обе стороны хотят продлить его на своих условиях.',
    hook: 'Собеседник напомнил, что текущие условия действуют ещё месяц.',
    player: 'Владелец договора',
    counterpart: 'Контрагент',
    goal: 'Длинный контракт и нормальная гарантия',
    issues: [
      { type_id: 'contract_months', reservation: 12, ideal: 24, weight: 'high' },
      { type_id: 'warranty_months', reservation: 6, ideal: 18, weight: 'low' },
    ],
  },
  {
    theme: 'project_budget',
    title: 'Бюджет проекта',
    tagline: 'Люди, бюджет и срок реакции',
    context: 'Нужно согласовать бюджет проекта и размер команды.',
    hook: 'Собеседник сразу спросил, сколько людей вы закладываете.',
    player: 'Руководитель проекта',
    counterpart: 'Заказчик',
    goal: 'Бюджет, который закрывает команду',
    issues: [
      { type_id: 'budget', reservation: 4_000_000, ideal: 6_000_000, weight: 'high' },
      { type_id: 'headcount', reservation: 4, ideal: 8, weight: 'medium' },
    ],
  },
]

const STOCK: Persona[] = [
  { id: 'toxic_cpo', name: 'Токсичный CPO', tagline: 'давит и перебивает' },
  { id: 'busy_ceo', name: 'Занятой CEO', tagline: 'цифры и итог' },
]

interface UserRow {
  login: string
  password: string
  telegramId?: number
  account: Account
}

interface StoredNegotiation extends NegotiationState {
  ownerId: string
  seat: string
  started_at: string
  finished_at: string | null
  playerTurns: number
}

interface ShareRow {
  id: string
  token: string
  negotiationId: string
  includeTranscript: boolean
  expires_at: string
  revoked: boolean
}

interface Db {
  users: UserRow[]
  tokens: Record<string, string>
  profiles: Record<string, CounterpartProfile>
  negotiations: StoredNegotiation[]
  shares: ShareRow[]
  idempotency: Record<string, unknown>
}

const STORAGE_KEY = 'arena-mock-db'
const emptyDb = (): Db => ({ users: [], tokens: {}, profiles: {}, negotiations: [], shares: [], idempotency: {} })

function load(): Db {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyDb()
    if (!localStorage.getItem(STORAGE_KEY)) localStorage.setItem(STORAGE_KEY, raw)
    return JSON.parse(raw) as Db
  } catch {
    return emptyDb()
  }
}

function save(db: Db) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function scenarioId(theme: string, sphere: SphereId) {
  return `${theme}__${sphere}`
}

function cardFor(id: string): ScenarioCard {
  const [theme, sphere] = id.split('__') as [string, SphereId]
  const seed = THEMES.find((item) => item.theme === theme)
  if (!seed || !SPHERES.some((item) => item.id === sphere)) fail(404, 'not_found', 'Сценарий не найден')
  if (theme === 'salary_raise' && sphere === 'founder') fail(404, 'not_found', 'Сценарий не найден')
  return {
    id,
    theme: seed.theme,
    theme_title: seed.title,
    sphere,
    seat: SEATS[sphere],
    context: seed.context,
    hook: seed.hook,
    roles: { player: seed.player, counterpart: seed.counterpart },
    defaults: {
      goal: seed.goal,
      issues: seed.issues.map((issue) => ({ ...issue })),
      batna: { text: 'Есть запасной вариант, но он дороже по времени' },
      counterpart_note: null,
      own_constraints: null,
    },
  }
}

function issueById(id: string) {
  return ISSUE_TYPES.find((item) => item.id === id)
}

function validateTerms(terms: Terms) {
  if (terms.issues.length < 2) fail(400, 'too_few_issues', 'Нужно хотя бы два условия')
  if (terms.issues.length > 4) fail(400, 'too_many_issues', 'Не больше четырёх условий')
  const seen = new Set<string>()
  terms.issues.forEach((issue, index) => {
    const type = issueById(issue.type_id)
    if (!type) fail(400, 'unknown_issue_type', 'Неизвестное условие', { issue_index: index, field: 'type_id' })
    if (seen.has(issue.type_id)) fail(400, 'duplicate_issue', 'Условие повторяется', { issue_index: index, field: 'type_id' })
    seen.add(issue.type_id)
    if (issue.reservation === issue.ideal) {
      fail(400, 'empty_range', 'Граница и идеал не должны совпадать', { issue_index: index, field: 'ideal' })
    }
    const [min, max] = type.range
    for (const field of ['reservation', 'ideal'] as const) {
      const value = issue[field]
      if (value < min || value > max) {
        fail(400, 'value_out_of_range', 'Значение вне диапазона', { issue_index: index, field, range: type.range })
      }
    }
  })
}

function midpoint(issue: IssueDraft): number {
  return Math.round((issue.reservation + issue.ideal) / 2)
}

function agreedFrom(terms: Terms): AgreedTerm[] {
  return terms.issues.map((issue) => {
    const type = issueById(issue.type_id)!
    return { type_id: issue.type_id, name: type.name, value: midpoint(issue), unit: type.unit }
  })
}

function outcomeScore(terms: Terms, agreed: AgreedTerm[]): number {
  if (!agreed.length) return 0
  const scores = terms.issues.map((issue) => {
    const value = agreed.find((item) => item.type_id === issue.type_id)?.value ?? issue.reservation
    const span = Math.abs(issue.ideal - issue.reservation) || 1
    const gained = Math.abs(value - issue.reservation)
    const weight = issue.weight === 'high' ? 1.4 : issue.weight === 'low' ? 0.7 : 1
    return Math.min(100, (gained / span) * 100) * weight
  })
  const total = scores.reduce((sum, value) => sum + value, 0) / scores.length
  return Math.round(Math.min(100, total))
}

let expireSession = () => {}

function userByToken(db: Db, token: string | null): UserRow {
  if (!token) fail(401, 'invalid_credentials', 'Нужно войти')
  const id = db.tokens[token]
  const user = db.users.find((item) => item.account.id === id)
  if (!user) {
    expireSession()
    fail(401, 'invalid_credentials', 'Токен отозван')
  }
  return user
}

function negotiationOf(db: Db, user: UserRow, id: string): StoredNegotiation {
  const row = db.negotiations.find((item) => item.id === id)
  if (!row) fail(404, 'not_found', 'Переговоры не найдены')
  if (row.ownerId !== user.account.id) fail(403, 'forbidden', 'Это чужие переговоры')
  return row
}

function publicNegotiation(row: StoredNegotiation): NegotiationState {
  const { ownerId: _owner, seat: _seat, started_at: _started, finished_at: _finished, playerTurns: _turns, ...state } = row
  return state
}

function listItem(row: StoredNegotiation): NegotiationListItem {
  return {
    id: row.id,
    status: row.status,
    theme_title: row.scenario.title,
    seat: row.seat,
    counterpart: { persona_id: row.counterpart.persona_id, name: row.counterpart.name },
    started_at: row.started_at,
    finished_at: row.finished_at,
    outcome: row.outcome ? { type: row.outcome.type, own_outcome: row.outcome.own_outcome } : null,
  }
}

function buildDebrief(row: StoredNegotiation): Debrief {
  const agreed = row.outcome?.terms ?? []
  const score = row.outcome?.own_outcome
  const origin = {
    source_type: 'SCENARIO_UTILITY_MODEL',
    formula_version: '1.0',
    threshold_source: 'arithmetic' as const,
    is_estimated: false,
  }
  const zone = score == null ? 'bad' : score >= 70 ? 'good' : score >= 40 ? 'normal' : 'bad'
  const deal = row.outcome?.type === 'deal'
  const metrics: Debrief['metrics'] = [
    deal
      ? { key: 'own_outcome', title: 'Выгода сделки', value: score ?? 0, unit: 'points', zone, available: true, origin }
      : { key: 'own_outcome', title: 'Выгода сделки', unit: 'points', zone: 'bad', available: false, unavailable_reason: 'Сделки не было', origin },
    deal
      ? { key: 'batna_gain', title: 'Выигрыш к альтернативе', value: Math.max(0, (score ?? 0) - 40), unit: 'points', zone: (score ?? 0) > 55 ? 'good' : 'normal', available: true, origin }
      : { key: 'batna_gain', title: 'Выигрыш к альтернативе', unit: 'points', zone: 'bad', available: false, unavailable_reason: 'Сделки не было', origin },
    { key: 'reservation_point_discipline', title: 'Дисциплина границы', value: deal, unit: 'boolean', zone: deal ? 'good' : 'bad', available: true, origin },
    { key: 'concession_discipline', title: 'Дисциплина уступок', value: 62, unit: 'points', zone: 'normal', available: true, origin: { ...origin, threshold_source: 'practice' } },
    { key: 'open_question_ratio', title: 'Доля открытых вопросов', value: 28, unit: 'percent', zone: 'normal', available: true, origin: { ...origin, threshold_source: 'academic' } },
    { key: 'filler_density', title: 'Слова-паразиты', value: 4, unit: 'count', zone: 'good', available: true, origin: { ...origin, threshold_source: 'expert_estimate' } },
  ]
  const quote = row.turns.find((turn) => turn.speaker === 'player')?.text ?? 'Давайте зафиксируем условия.'
  return {
    outcome: row.outcome ?? { type: 'no_deal', own_outcome: null, terms: [] },
    metrics,
    growth_areas: ['concession_discipline', 'own_outcome'],
    guidance: [
      {
        kind: 'turning_point',
        claim: `По «${agreed[0]?.name ?? 'условию'}» уступка прозвучала без встречного запроса.`,
        effect: `${row.counterpart.name} прочитала это как готовность уступать дальше.`,
        advice: 'Любая уступка — в обмен на встречное движение по другому условию.',
        evidence: { turn_index: row.turns.at(-1)?.index ?? 1, quote },
      },
    ],
  }
}

function replyFor(persona: string, text: string): string {
  if (persona === 'toxic_cpo') return `Это слабо. Конкретику давайте, а не «${text.slice(0, 42)}». Что с цифрой?`
  if (persona === 'busy_ceo') return 'Коротко: какая цифра и что я получаю взамен?'
  if (persona === 'custom') return 'Уточните.'
  return 'Слышу вас. Давайте сверим цифры и что для вас неприемлемо.'
}

function remember<T>(db: Db, key: string, value: T): T {
  db.idempotency[key] = value
  save(db)
  return value
}

export function createMockApi(getToken: () => string | null, expired: () => void = () => {}): Api {
  expireSession = expired
  return {
    async signUp(login, password) {
      const db = load()
      if (password.length < 6) fail(400, 'weak_password', 'Пароль слишком короткий')
      if (db.users.some((user) => user.login.toLowerCase() === login.toLowerCase())) fail(409, 'login_taken', 'Логин занят')
      const account: Account = { id: crypto.randomUUID(), display_name: '', is_guest: false, spheres: [] }
      const token = crypto.randomUUID()
      db.users.push({ login, password, account })
      db.tokens[token] = account.id
      save(db)
      return { token, account }
    },
    async signInTelegram(body) {
      const db = load()
      const display = [body.first_name, body.last_name].filter(Boolean).join(' ') || body.username || 'Участник'
      let user = db.users.find((item) => item.telegramId === body.id)
      const returning = Boolean(user)
      if (!user) {
        user = {
          login: body.username ? `@${body.username}` : `tg:${body.id}`,
          password: '',
          telegramId: body.id,
          account: { id: crypto.randomUUID(), display_name: display, is_guest: false, spheres: [] },
        }
        db.users.push(user)
      } else if (!user.account.display_name) {
        user.account.display_name = display
      }
      const token = crypto.randomUUID()
      db.tokens[token] = user.account.id
      save(db)
      return { token, account: user.account, returning }
    },
    async signIn(login, password) {
      const db = load()
      const user = db.users.find((item) => item.login === login && item.password === password)
      if (!user) fail(401, 'invalid_credentials', 'Неверный логин или пароль')
      const token = crypto.randomUUID()
      db.tokens[token] = user.account.id
      save(db)
      return { token, account: user.account }
    },
    async guest() {
      const db = load()
      const account: Account = { id: crypto.randomUUID(), display_name: '', is_guest: true, spheres: [] }
      const token = crypto.randomUUID()
      db.users.push({ login: `guest-${account.id.slice(0, 8)}`, password: '', account })
      db.tokens[token] = account.id
      save(db)
      return { token, account }
    },
    async upgrade(login, password) {
      const db = load()
      const user = userByToken(db, getToken())
      if (!user.account.is_guest) fail(409, 'already_registered', 'Аккаунт уже постоянный')
      if (password.length < 6) fail(400, 'weak_password', 'Пароль слишком короткий')
      if (db.users.some((item) => item.login.toLowerCase() === login.toLowerCase())) fail(409, 'login_taken', 'Логин занят')
      user.login = login
      user.password = password
      user.account.is_guest = false
      save(db)
      return { token: getToken()!, account: user.account }
    },
    async signOut() {
      const db = load()
      const token = getToken()
      if (token) delete db.tokens[token]
      save(db)
    },
    async getAccount() {
      const db = load()
      return { account: userByToken(db, getToken()).account }
    },
    async patchAccount(body) {
      const db = load()
      const user = userByToken(db, getToken())
      if (body.display_name !== undefined) user.account.display_name = body.display_name
      if (body.spheres !== undefined) user.account.spheres = body.spheres
      save(db)
      return { account: user.account }
    },
    async issueTypes() {
      return { items: ISSUE_TYPES }
    },
    async scenarios() {
      const db = load()
      const user = userByToken(db, getToken())
      const chosen = user.account.spheres.length ? user.account.spheres : SPHERES.map((item) => item.id)
      const themes = THEMES.map((seed) => ({
        theme: seed.theme,
        title: seed.title,
        tagline: seed.tagline,
        variants: chosen
          .filter((sphere) => !(seed.theme === 'salary_raise' && sphere === 'founder'))
          .map((sphere) => ({ id: scenarioId(seed.theme, sphere), sphere, seat: SEATS[sphere] })),
      })).filter((theme) => theme.variants.length)
      const spheres = (user.account.spheres.length ? SPHERES.filter((item) => chosen.includes(item.id)) : SPHERES)
      return { spheres, themes } satisfies ScenariosResponse
    },
    async scenario(id) {
      return cardFor(id)
    },
    async personas() {
      const db = load()
      const user = userByToken(db, getToken())
      const profile = db.profiles[user.account.id]
      const custom: Persona = profile
        ? { id: 'custom', name: 'Свой собеседник', tagline: 'Копия реального человека', configured: true, source: profile.source }
        : { id: 'custom', name: 'Свой собеседник', tagline: 'Копия реального человека', configured: false }
      return { items: [...STOCK, custom] }
    },
    async getCounterpart() {
      const db = load()
      const user = userByToken(db, getToken())
      const profile = db.profiles[user.account.id]
      if (!profile) fail(404, 'not_found', 'Карточка не заполнена')
      return profile
    },
    async putCounterpart(body) {
      const db = load()
      const user = userByToken(db, getToken())
      if (body.sample_phrases.length > 5) fail(400, 'too_many_phrases', 'Не больше пяти фраз')
      if (body.sample_phrases.some((phrase) => phrase.length > 200)) fail(400, 'phrase_too_long', 'Фраза длиннее 200 символов')
      const profile: CounterpartProfile = { ...body, source: body.source || 'manual' }
      db.profiles[user.account.id] = profile
      save(db)
      return profile
    },
    async deleteCounterpart() {
      const db = load()
      const user = userByToken(db, getToken())
      delete db.profiles[user.account.id]
      save(db)
    },
    async importCounterpart(personId) {
      userByToken(load(), getToken())
      if (personId === 'unavailable') fail(503, 'source_unavailable', 'Источник недоступен')
      return {
        display_name: 'Ирина',
        role: 'Директор по закупкам',
        address_form: 'formal',
        reply_length: 'short',
        formality: 0.7,
        traits: ['перебивает', 'требует конкретики'],
        sample_phrases: ['Давайте ближе к делу', 'Это не наш уровень цен'],
        source: 'cognico',
      }
    },
    async startNegotiation(body, idempotencyKey) {
      const db = load()
      const cached = db.idempotency[idempotencyKey] as NegotiationCreated | undefined
      if (cached) return cached
      const user = userByToken(db, getToken())
      validateTerms(body.terms)
      for (const row of db.negotiations) {
        if (row.ownerId === user.account.id && row.status === 'active') row.status = 'interrupted'
      }
      const card = body.scenario_id ? cardFor(body.scenario_id) : null
      const profile = db.profiles[user.account.id]
      const stock = STOCK.find((item) => item.id === body.persona_id)
      const name = body.persona_id === 'custom' ? (profile?.display_name || 'Молчун') : (stock?.name ?? 'Собеседник')
      const role = body.persona_id === 'custom' ? (profile?.role || 'Собеседник') : (card?.roles.counterpart ?? 'Собеседник')
      const opening = body.persona_id === 'busy_ceo'
        ? 'У меня пятнадцать минут. Что предлагаете?'
        : card?.hook ?? 'Слушаю. С чего начнём?'
      const now = new Date().toISOString()
      const created: NegotiationCreated = {
        id: crypto.randomUUID(),
        phase: 'opening',
        turn_index: 0,
        turns_left: 16,
        counterpart: { persona_id: body.persona_id, name, role },
        terms: body.terms,
        opening_utterance: opening,
        limits: { turn_limit: 16, max_utterance_chars: 1200 },
      }
      const stored: StoredNegotiation = {
        ...created,
        status: 'active',
        scenario: { id: body.scenario_id, title: card?.theme_title ?? 'Свой сценарий' },
        turns: [{ index: 0, speaker: 'counterpart', text: opening, at: now }],
        outcome: null,
        pending_deal: null,
        ownerId: user.account.id,
        seat: card?.seat ?? 'Свой сценарий',
        started_at: now,
        finished_at: null,
        playerTurns: 0,
      }
      db.negotiations.unshift(stored)
      return remember(db, idempotencyKey, created)
    },
    async getNegotiation(id) {
      const db = load()
      return publicNegotiation(negotiationOf(db, userByToken(db, getToken()), id))
    },
    async listNegotiations(limit, cursor) {
      const db = load()
      const user = userByToken(db, getToken())
      const mine = db.negotiations.filter((item) => item.ownerId === user.account.id)
      const start = cursor ? mine.findIndex((item) => item.id === cursor) + 1 : 0
      const page = mine.slice(start, start + limit)
      const next = mine[start + limit]
      return { items: page.map(listItem), next_cursor: next ? page.at(-1)?.id ?? null : null }
    },
    async submitTurn(id, text, idempotencyKey, onEvent) {
      const db = load()
      const cached = db.idempotency[idempotencyKey] as TurnReplay | undefined
      if (cached) return cached
      const user = userByToken(db, getToken())
      const row = negotiationOf(db, user, id)
      if (row.status !== 'active') fail(409, 'negotiation_finished', 'Переговоры уже завершены')
      if (text.length > row.limits.max_utterance_chars) fail(400, 'utterance_too_long', 'Реплика слишком длинная')
      const emit = async (event: TurnEvent) => {
        onEvent(event)
        await sleep(event.event === 'utterance_delta' ? 80 : 240)
      }
      await emit({ event: 'thinking', data: {} })
      if (text.includes('/fail')) {
        await emit({ event: 'utterance_delta', data: { text: 'Секунду…' } })
        await emit({ event: 'stream_failed', data: { code: 'stream_failed', message: 'Поток оборвался' } })
        await emit({ event: 'done', data: { phase: row.phase, status: row.status } })
        save(db)
        return null
      }
      const now = new Date().toISOString()
      row.turns.push({ index: row.turn_index + 1, speaker: 'player', text, at: now })
      row.playerTurns += 1
      const nextIndex = row.playerTurns
      let utterance = replyFor(row.counterpart.persona_id, text)
      let deal: { terms: AgreedTerm[]; summary: string } | undefined
      let status: NegotiationStatus = row.status
      if (text.includes('/leave')) {
        utterance = 'На этом всё. Я выхожу из разговора.'
        row.status = 'finished'
        row.finished_at = now
        row.outcome = { type: 'no_deal', own_outcome: null, terms: [] }
        status = 'finished'
      } else if (text.includes('/deal') || nextIndex % 4 === 0) {
        const terms = agreedFrom(row.terms)
        deal = { terms, summary: 'Условия сошлись. Подтвердите сделку или вернитесь к торгу.' }
        utterance = 'Похоже, мы сошлись. Проверьте цифры.'
        row.pending_deal = deal
        row.phase = 'closing'
      } else if (row.phase === 'opening') row.phase = 'exploration'
      else row.phase = 'bargaining'
      for (const part of utterance.match(/.{1,28}/g) ?? [utterance]) {
        await emit({ event: 'utterance_delta', data: { text: part } })
      }
      row.turns.push({ index: row.turn_index + 2, speaker: 'counterpart', text: utterance, at: new Date().toISOString() })
      row.turn_index = nextIndex
      row.turns_left = Math.max(0, row.limits.turn_limit - nextIndex)
      if (row.turns_left === 0 && row.status === 'active' && !deal) {
        row.status = 'finished'
        row.finished_at = new Date().toISOString()
        row.outcome = { type: 'no_deal', own_outcome: null, terms: [] }
        status = 'finished'
      }
      await emit({ event: 'turn_committed', data: { turn_index: row.turn_index, phase: row.phase, turns_left: row.turns_left } })
      if (deal) await emit({ event: 'deal_proposed', data: deal })
      if (text.includes('/leave')) await emit({ event: 'counterpart_left', data: { reason: 'Собеседник прервал переговоры' } })
      if (row.turns_left === 0) await emit({ event: 'turn_limit_reached', data: {} })
      await emit({ event: 'done', data: { phase: row.phase, status } })
      const replay: TurnReplay = {
        turn_index: row.turn_index,
        phase: row.phase,
        turns_left: row.turns_left,
        utterance,
        ...(deal ? { deal_proposed: deal } : {}),
      }
      remember(db, idempotencyKey, replay)
      return null
    },
    async acceptDeal(id) {
      const db = load()
      const row = negotiationOf(db, userByToken(db, getToken()), id)
      if (!row.pending_deal) fail(409, 'no_converged_terms', 'Схождения уже нет')
      const terms = row.pending_deal.terms
      const outcome: Outcome = { type: 'deal', terms, own_outcome: outcomeScore(row.terms, terms) }
      row.outcome = outcome
      row.status = 'finished'
      row.pending_deal = null
      row.finished_at = new Date().toISOString()
      save(db)
      return { status: 'finished' as const, outcome }
    },
    async rejectDeal(id) {
      const db = load()
      const row = negotiationOf(db, userByToken(db, getToken()), id)
      row.pending_deal = null
      row.phase = 'bargaining'
      save(db)
      return publicNegotiation(row)
    },
    async walkAway(id) {
      const db = load()
      const row = negotiationOf(db, userByToken(db, getToken()), id)
      if (row.status !== 'active') fail(409, 'negotiation_finished', 'Переговоры уже завершены')
      const outcome: Outcome = { type: 'no_deal', own_outcome: null, terms: [] }
      row.outcome = outcome
      row.status = 'finished'
      row.pending_deal = null
      row.finished_at = new Date().toISOString()
      save(db)
      return { status: 'finished' as const, outcome }
    },
    async debrief(id) {
      const db = load()
      const row = negotiationOf(db, userByToken(db, getToken()), id)
      if (row.status !== 'finished') fail(409, 'debrief_unavailable', 'Разбор пока недоступен')
      return buildDebrief(row)
    },
    async share(id, ttlHours, includeTranscript) {
      const db = load()
      const user = userByToken(db, getToken())
      const row = negotiationOf(db, user, id)
      if (row.status !== 'finished') fail(409, 'debrief_unavailable', 'Незавершёнными переговорами поделиться нельзя')
      const share: ShareRow = {
        id: crypto.randomUUID(),
        token: crypto.randomUUID(),
        negotiationId: row.id,
        includeTranscript,
        expires_at: new Date(Date.now() + ttlHours * 3600_000).toISOString(),
        revoked: false,
      }
      db.shares.push(share)
      save(db)
      return { id: share.id, url: `/s/${share.token}`, expires_at: share.expires_at }
    },
    async revokeShare(id) {
      const db = load()
      userByToken(db, getToken())
      const share = db.shares.find((item) => item.id === id)
      if (!share) fail(404, 'not_found', 'Ссылка не найдена')
      share.revoked = true
      save(db)
    },
    async sharedResult(token) {
      const db = load()
      const share = db.shares.find((item) => item.token === token)
      if (!share || share.revoked) fail(410, 'link_revoked', 'Ссылка отозвана')
      if (new Date(share.expires_at).getTime() < Date.now()) fail(410, 'link_expired', 'Ссылка просрочена')
      const row = db.negotiations.find((item) => item.id === share.negotiationId)
      if (!row || row.status !== 'finished') fail(409, 'debrief_unavailable', 'Разбор недоступен')
      const debrief = buildDebrief(row)
      const result: SharedResult = {
        ...debrief,
        transcript: share.includeTranscript ? row.turns : null,
        expires_at: share.expires_at,
      }
      return result
    },
  }
}
