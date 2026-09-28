import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { getApi } from '@/api'
import type { NegotiationListItem } from '@/api/types'
import { useSessionStore } from './session'

interface TrainingsCache {
  items: NegotiationListItem[]
  cursor: string | null
}

function storageKey(accountId: string) {
  return `arena-trainings:${accountId || 'guest'}`
}

function readCache(accountId: string): TrainingsCache {
  const raw = localStorage.getItem(storageKey(accountId))
  if (!raw) return { items: [], cursor: null }
  try {
    const parsed = JSON.parse(raw) as Partial<TrainingsCache>
    return {
      items: Array.isArray(parsed.items) ? parsed.items : [],
      cursor: typeof parsed.cursor === 'string' ? parsed.cursor : null,
    }
  } catch {
    return { items: [], cursor: null }
  }
}

export const useTrainingsStore = defineStore('trainings', () => {
  const session = useSessionStore()
  const items = ref<NegotiationListItem[]>([])
  const cursor = ref<string | null>(null)

  function accountId() {
    return session.account?.id || session.login || 'guest'
  }

  function hydrate() {
    const cache = readCache(accountId())
    items.value = cache.items
    cursor.value = cache.cursor
  }

  function persist() {
    const cache: TrainingsCache = { items: items.value, cursor: cursor.value }
    localStorage.setItem(storageKey(accountId()), JSON.stringify(cache))
  }

  async function refresh() {
    const owner = accountId()
    const page = await getApi().listNegotiations(50, null)
    if (accountId() !== owner) return
    items.value = page.items
    cursor.value = page.next_cursor
    persist()
  }

  async function loadMore() {
    if (!cursor.value) return
    const owner = accountId()
    const page = await getApi().listNegotiations(20, cursor.value)
    if (accountId() !== owner) return
    const seen = new Set(items.value.map((item) => item.id))
    items.value.push(...page.items.filter((item) => !seen.has(item.id)))
    cursor.value = page.next_cursor
    persist()
  }

  watch(() => session.account?.id ?? session.login, () => hydrate())
  hydrate()

  return { items, cursor, refresh, loadMore }
})
