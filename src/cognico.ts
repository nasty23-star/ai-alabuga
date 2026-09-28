import type { AddressForm, CounterpartSource, IssueDraft, ReplyLength } from '@/api/types'

const RETURN_KEY = 'arena-cognico-return'
const DRAFT_KEY = 'arena-counterpart-draft'

export type CognicoReturn = 'connected' | 'error'

export interface CounterpartDraft {
  nameLine: string
  formality: number
  talkativeness: number
  phrases: string[]
  traits: string[]
  displayName: string
  role: string
  source: CounterpartSource
  addressForm: AddressForm
  replyLength: ReplyLength
  wizard: {
    scenarioId: string | null
    goal: string
    batna: string
    note: string
    constraints: string
    issues: IssueDraft[]
    personaId: string
  }
}

function asReturn(value: string | null): CognicoReturn | null {
  return value === 'connected' || value === 'error' ? value : null
}

export function captureCognicoReturn() {
  const fromSearch = asReturn(new URLSearchParams(window.location.search).get('cognico'))
  const hash = window.location.hash
  const hashQuery = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : ''
  const fromHash = asReturn(new URLSearchParams(hashQuery).get('cognico'))
  const flag = fromSearch ?? fromHash
  if (!flag) return
  sessionStorage.setItem(RETURN_KEY, flag)
  const url = new URL(window.location.href)
  url.searchParams.delete('cognico')
  if (url.hash.includes('?')) {
    const [path, query] = url.hash.split('?')
    const params = new URLSearchParams(query)
    params.delete('cognico')
    const rest = params.toString()
    url.hash = rest ? `${path}?${rest}` : path
  }
  history.replaceState(history.state, '', `${url.pathname}${url.search}${url.hash}`)
}

export function peekCognicoReturn(): CognicoReturn | null {
  return asReturn(sessionStorage.getItem(RETURN_KEY))
}

export function takeCognicoReturn(): CognicoReturn | null {
  const flag = peekCognicoReturn()
  if (flag) sessionStorage.removeItem(RETURN_KEY)
  return flag
}

export function saveCounterpartDraft(draft: CounterpartDraft) {
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
}

export function readCounterpartDraft(): CounterpartDraft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as CounterpartDraft
    if (!data || typeof data.nameLine !== 'string' || !Array.isArray(data.phrases) || !data.wizard) return null
    if (!Array.isArray(data.wizard.issues)) return null
    return data
  } catch {
    return null
  }
}

export function clearCounterpartDraft() {
  sessionStorage.removeItem(DRAFT_KEY)
}
