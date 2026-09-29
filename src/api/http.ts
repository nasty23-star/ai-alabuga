import { ApiError } from './errors'
import { loadRememberedShares } from '@/myShares'
import { readSse } from './sse'
import type {
  Account,
  AuthResponse,
  CognicoConnect,
  CognicoRecording,
  CognicoStatus,
  CounterpartImport,
  CounterpartProfile,
  Debrief,
  IssueType,
  NegotiationCreated,
  NegotiationListItem,
  NegotiationState,
  Persona,
  ScenarioCard,
  ScenariosResponse,
  MyShare,
  SharedLink,
  SharedResult,
  StartNegotiationBody,
  TurnEvent,
  TurnReplay,
} from './types'

export interface Api {
  signUp(login: string, password: string): Promise<AuthResponse>
  signIn(login: string, password: string): Promise<AuthResponse>
  signInTelegram(body: { init_data: string; id: number; first_name: string; last_name: string; username: string }): Promise<AuthResponse>
  guest(): Promise<AuthResponse>
  upgrade(login: string, password: string): Promise<AuthResponse>
  signOut(): Promise<void>
  getAccount(): Promise<{ account: Account }>
  patchAccount(body: Partial<Pick<Account, 'display_name' | 'spheres'>>): Promise<{ account: Account }>
  issueTypes(): Promise<{ items: IssueType[] }>
  scenarios(): Promise<ScenariosResponse>
  scenario(id: string): Promise<ScenarioCard>
  personas(): Promise<{ items: Persona[] }>
  getCounterpart(): Promise<CounterpartProfile>
  putCounterpart(body: CounterpartProfile): Promise<CounterpartProfile>
  deleteCounterpart(): Promise<void>
  cognicoStatus(): Promise<CognicoStatus>
  connectCognico(): Promise<CognicoConnect>
  disconnectCognico(): Promise<void>
  cognicoRecordings(): Promise<{ items: CognicoRecording[] }>
  importCounterpart(body: CounterpartImport): Promise<CounterpartProfile>
  startNegotiation(body: StartNegotiationBody, idempotencyKey: string): Promise<NegotiationCreated>
  getNegotiation(id: string): Promise<NegotiationState>
  listNegotiations(limit: number, cursor: string | null): Promise<{ items: NegotiationListItem[]; next_cursor: string | null }>
  submitTurn(
    id: string,
    text: string,
    idempotencyKey: string,
    onEvent: (event: TurnEvent) => void,
  ): Promise<TurnReplay | null>
  acceptDeal(id: string): Promise<{ status: 'finished'; outcome: NegotiationState['outcome'] }>
  rejectDeal(id: string): Promise<NegotiationState>
  walkAway(id: string): Promise<{ status: 'finished'; outcome: NegotiationState['outcome'] }>
  debrief(id: string): Promise<Debrief>
  share(id: string, ttlHours: number, includeTranscript: boolean): Promise<SharedLink>
  listShares(): Promise<{ items: MyShare[] }>
  revokeShare(id: string): Promise<void>
  sharedResult(token: string): Promise<SharedResult>
}

let tokenGetter: () => string | null = () => null
let onUnauthorized: () => void = () => {}

export function bindAuth(getToken: () => string | null, unauthorized: () => void) {
  tokenGetter = getToken
  onUnauthorized = unauthorized
}

const base = () => (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

async function request<T>(path: string, init: RequestInit = {}, idempotencyKey?: string): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  const token = tokenGetter()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (idempotencyKey) headers.set('Idempotency-Key', idempotencyKey)
  const response = await fetch(`${base()}${path}`, { ...init, headers })
  if (response.status === 401) {
    onUnauthorized()
    throw new ApiError(401, 'invalid_credentials', 'Нужно войти снова')
  }
  if (response.status === 204) return undefined as T
  const payload = (await response.json()) as T & { error?: { code: string; message: string; details?: Record<string, unknown> } }
  if (!response.ok) {
    const error = payload.error
    throw new ApiError(response.status, error?.code ?? 'invalid_request', error?.message ?? 'Ошибка запроса', error?.details ?? {})
  }
  return payload
}

function asTurnEvent(event: string, data: unknown): TurnEvent {
  return { event, data } as TurnEvent
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

function readConnected(payload: unknown): boolean {
  const row = asRecord(payload)
  if (typeof row.connected === 'boolean') return row.connected
  return row.status === 'connected' || row.state === 'connected'
}

function readCognicoUrl(payload: unknown): string {
  const row = asRecord(payload)
  const url = [row.authorize_url, row.url, row.authorization_url, row.auth_url, row.redirect_url, row.link].find((item) => typeof item === 'string' && item)
  if (typeof url !== 'string') throw new ApiError(502, 'invalid_request', 'Нет ссылки для подключения CogniCo')
  return url
}

function readText(row: Record<string, unknown>, keys: string[]) {
  const value = keys.map((key) => row[key]).find((item) => typeof item === 'string' && item.trim())
  return typeof value === 'string' ? value : null
}

function readCount(row: Record<string, unknown>, keys: string[]) {
  const value = keys.map((key) => row[key]).find((item) => typeof item === 'number' && Number.isFinite(item))
  return typeof value === 'number' ? value : 0
}

function readShare(item: unknown): MyShare | null {
  const rec = asRecord(item)
  const negotiation = asRecord(rec.negotiation ?? rec.scenario)
  const id = rec.id ?? rec.share_id
  const url = readText(rec, ['url', 'link'])
  if ((typeof id !== 'string' && typeof id !== 'number') || !url) return null
  const status = typeof rec.status === 'string' ? rec.status : ''
  const revokedAt = readText(rec, ['revoked_at', 'revokedAt'])
  const revoked = rec.revoked === true || status === 'revoked' || status === 'отозвана' || Boolean(revokedAt)
  return {
    id: String(id),
    url,
    title: readText(rec, ['theme_title', 'title', 'scenario_title', 'name'])
      ?? readText(negotiation, ['theme_title', 'title', 'name'])
      ?? 'Разбор',
    expires_at: readText(rec, ['expires_at', 'expiresAt']) ?? '',
    created_at: readText(rec, ['created_at', 'shared_at', 'issued_at', 'started_at']),
    revoked_at: revoked ? revokedAt : null,
    views: readCount(rec, ['view_count', 'views', 'opens', 'open_count']),
    note: readText(rec, ['note', 'label', 'caption']),
  }
}

function readShares(payload: unknown): { items: MyShare[] } {
  const row = asRecord(payload)
  const raw = Array.isArray(payload)
    ? payload
    : Array.isArray(row.items)
      ? row.items
      : Array.isArray(row.shares)
        ? row.shares
        : Array.isArray(row.results)
          ? row.results
          : Array.isArray(row.shared_results)
            ? row.shared_results
            : row.shared_result
              ? [row.shared_result]
              : readShare(payload)
                ? [payload]
                : []
  return { items: raw.flatMap((item) => {
    const share = readShare(item)
    return share ? [share] : []
  }) }
}

async function readSharesAt(path: string) {
  try {
    return readShares(await request<unknown>(path))
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

function readRecordings(payload: unknown): { items: CognicoRecording[] } {
  const row = asRecord(payload)
  const raw = Array.isArray(payload) ? payload : Array.isArray(row.items) ? row.items : Array.isArray(row.recordings) ? row.recordings : []
  const items = raw.flatMap((item) => {
    const rec = asRecord(item)
    const id = rec.id ?? rec.recording_id
    const title = rec.title ?? rec.name ?? rec.subject
    const recorded = rec.recorded_at ?? rec.started_at ?? rec.date ?? rec.created_at
    if ((typeof id !== 'string' && typeof id !== 'number') || typeof title !== 'string') return []
    return [{ id: String(id), title, recorded_at: typeof recorded === 'string' ? recorded : '' }]
  })
  return { items }
}

export function createHttpApi(): Api {
  return {
    signUp: (login, password) => request('/api/auth/sign-up', { method: 'POST', body: JSON.stringify({ login, password }) }),
    signIn: (login, password) => request('/api/auth/sign-in', { method: 'POST', body: JSON.stringify({ login, password }) }),
    signInTelegram: (body) => request('/api/auth/telegram', { method: 'POST', body: JSON.stringify(body) }),
    guest: () => request('/api/auth/guest', { method: 'POST' }, crypto.randomUUID()),
    upgrade: (login, password) => request('/api/auth/upgrade', { method: 'POST', body: JSON.stringify({ login, password }) }),
    signOut: () => request('/api/auth/sign-out', { method: 'POST' }),
    getAccount: () => request('/api/account'),
    patchAccount: (body) => request('/api/account', { method: 'PATCH', body: JSON.stringify(body) }),
    issueTypes: () => request('/api/issue-types'),
    scenarios: () => request('/api/scenarios'),
    scenario: (id) => request(`/api/scenarios/${id}`),
    personas: () => request('/api/personas'),
    getCounterpart: () => request('/api/counterpart-profile'),
    putCounterpart: (body) => request('/api/counterpart-profile', { method: 'PUT', body: JSON.stringify(body) }),
    deleteCounterpart: () => request('/api/counterpart-profile', { method: 'DELETE' }),
    async cognicoStatus() {
      try {
        return { connected: readConnected(await request<unknown>('/api/integrations/cognico')) }
      } catch (error) {
        if (error instanceof ApiError && (error.status === 404 || error.code === 'cognico_not_connected' || error.code === 'not_connected')) {
          return { connected: false }
        }
        throw error
      }
    },
    async connectCognico() {
      return { url: readCognicoUrl(await request<unknown>('/api/integrations/cognico/connect', { method: 'POST' })) }
    },
    disconnectCognico: () => request('/api/integrations/cognico', { method: 'DELETE' }),
    async cognicoRecordings() {
      return readRecordings(await request<unknown>('/api/integrations/cognico/recordings'))
    },
    importCounterpart: (body) => {
      const payload: { source: 'cognico'; recording_id: string; speaker_name?: string } = {
        source: 'cognico',
        recording_id: body.recording_id,
      }
      const speaker = body.speaker_name?.trim()
      if (speaker) payload.speaker_name = speaker
      return request('/api/counterpart-profile/import', { method: 'POST', body: JSON.stringify(payload) })
    },
    startNegotiation: (body, idempotencyKey) =>
      request('/api/negotiations', { method: 'POST', body: JSON.stringify(body) }, idempotencyKey),
    getNegotiation: (id) => request(`/api/negotiations/${id}`),
    listNegotiations: (limit, cursor) => {
      const query = new URLSearchParams({ limit: String(limit) })
      if (cursor) query.set('cursor', cursor)
      return request(`/api/negotiations?${query.toString()}`)
    },
    async submitTurn(id, text, idempotencyKey, onEvent) {
      const headers = new Headers({ 'Content-Type': 'application/json' })
      const token = tokenGetter()
      if (token) headers.set('Authorization', `Bearer ${token}`)
      headers.set('Idempotency-Key', idempotencyKey)
      const response = await fetch(`${base()}/api/negotiations/${id}/turns`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ text }),
      })
      if (response.status === 401) {
        onUnauthorized()
        throw new ApiError(401, 'invalid_credentials', 'Нужно войти снова')
      }
      if (!response.ok) {
        const payload = (await response.json()) as { error?: { code: string; message: string; details?: Record<string, unknown> } }
        throw new ApiError(response.status, payload.error?.code ?? 'invalid_request', payload.error?.message ?? 'Ошибка хода', payload.error?.details ?? {})
      }
      const contentType = response.headers.get('content-type') ?? ''
      if (contentType.includes('application/json')) return (await response.json()) as TurnReplay
      await readSse(response, (event, data) => onEvent(asTurnEvent(event, data)))
      return null
    },
    acceptDeal: (id) => request(`/api/negotiations/${id}/deal/accept`, { method: 'POST' }, crypto.randomUUID()),
    rejectDeal: (id) => request(`/api/negotiations/${id}/deal/reject`, { method: 'POST' }, crypto.randomUUID()),
    walkAway: (id) => request(`/api/negotiations/${id}/walk-away`, { method: 'POST' }, crypto.randomUUID()),
    debrief: (id) => request(`/api/negotiations/${id}/debrief`),
    share: (id, ttlHours, includeTranscript) =>
      request(
        `/api/negotiations/${id}/shared-result`,
        { method: 'POST', body: JSON.stringify({ ttl_hours: ttlHours, include_transcript: includeTranscript }) },
        crypto.randomUUID(),
      ),
    listShares: async () => {
      const remote = await readSharesAt('/api/shared-results')
      const local = loadRememberedShares()
      if (!remote) return { items: local }
      const seen = new Set(remote.items.map((item) => item.id))
      return { items: [...remote.items, ...local.filter((item) => !seen.has(item.id))] }
    },
    revokeShare: (id) => request(`/api/shared-results/${id}`, { method: 'DELETE' }),
    sharedResult: (token) => request(`/api/shared-results/${token}`),
  }
}
