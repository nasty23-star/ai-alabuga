import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { CounterpartProfile } from '@/api/types'
import { useSessionStore } from './session'

interface CounterpartCache {
  profile: CounterpartProfile | null
  cognicoConnected: boolean | null
}

function storageKey(accountId: string) {
  return `arena-counterpart:${accountId || 'guest'}`
}

function isProfile(value: unknown): value is CounterpartProfile {
  if (!value || typeof value !== 'object') return false
  const profile = value as Partial<CounterpartProfile>
  return typeof profile.display_name === 'string'
    && typeof profile.role === 'string'
    && Array.isArray(profile.traits)
    && Array.isArray(profile.sample_phrases)
}

function readCache(accountId: string): CounterpartCache {
  const raw = localStorage.getItem(storageKey(accountId))
  if (!raw) return { profile: null, cognicoConnected: null }
  try {
    const parsed = JSON.parse(raw) as Partial<CounterpartCache>
    return {
      profile: isProfile(parsed.profile) ? parsed.profile : null,
      cognicoConnected: typeof parsed.cognicoConnected === 'boolean' ? parsed.cognicoConnected : null,
    }
  } catch {
    return { profile: null, cognicoConnected: null }
  }
}

export function copyProfile(profile: CounterpartProfile): CounterpartProfile {
  return {
    ...profile,
    traits: [...profile.traits],
    sample_phrases: [...profile.sample_phrases],
  }
}

export const useCounterpartStore = defineStore('counterpart', () => {
  const session = useSessionStore()
  const profile = ref<CounterpartProfile | null>(null)
  const cognicoConnected = ref<boolean | null>(null)

  function accountId() {
    return session.account?.id || session.login || 'guest'
  }

  function hydrate() {
    const cache = readCache(accountId())
    profile.value = cache.profile ? copyProfile(cache.profile) : null
    cognicoConnected.value = cache.cognicoConnected
  }

  function persist() {
    const cache: CounterpartCache = {
      profile: profile.value ? copyProfile(profile.value) : null,
      cognicoConnected: cognicoConnected.value,
    }
    localStorage.setItem(storageKey(accountId()), JSON.stringify(cache))
  }

  function remember(next: CounterpartProfile) {
    profile.value = copyProfile(next)
    persist()
  }

  function rememberCognico(connected: boolean) {
    cognicoConnected.value = connected
    persist()
  }

  watch(() => session.account?.id ?? session.login, () => hydrate())
  hydrate()

  return { profile, cognicoConnected, remember, rememberCognico }
})
