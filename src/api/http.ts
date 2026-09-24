import { ApiError } from './errors'
import { readSse } from './sse'
import type {
  Account,
  AuthResponse,
  CounterpartProfile,
  Debrief,
  IssueType,
  NegotiationCreated,
  NegotiationListItem,
  NegotiationState,
  Persona,
  ScenarioCard,
  ScenariosResponse,
  SharedLink,
  SharedResult,
  StartNegotiationBody,
  TurnEvent,
  TurnReplay,
} from './types'

export interface Api {
  signUp(login: string, password: string): Promise<AuthResponse>
  signIn(login: string, password: string): Promise<AuthResponse>
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
  importCounterpart(personId: string): Promise<CounterpartProfile>
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

export function createHttpApi(): Api {
  return {
    signUp: (login, password) => request('/api/auth/sign-up', { method: 'POST', body: JSON.stringify({ login, password }) }),
    signIn: (login, password) => request('/api/auth/sign-in', { method: 'POST', body: JSON.stringify({ login, password }) }),
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
    importCounterpart: (personId) =>
      request('/api/counterpart-profile/import', {
        method: 'POST',
        body: JSON.stringify({ source: 'cognico', person_id: personId }),
      }),
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
    revokeShare: (id) => request(`/api/shared-results/${id}`, { method: 'DELETE' }),
    sharedResult: (token) => request(`/api/shared-results/${token}`),
  }
}
