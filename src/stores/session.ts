import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { ApiError, configureApi, getApi, syncToken } from '@/api'
import type { Account, SphereId } from '@/api/types'

const TOKEN_KEY = 'arena-token'
const LOGIN_KEY = 'arena-login'
const ACCOUNT_KEY = 'arena-account'
const ONBOARD_KEY = 'arena-onboarded'

function readAccount(): Account | null {
  const raw = localStorage.getItem(ACCOUNT_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as Account
  } catch {
    return null
  }
}

export const useSessionStore = defineStore('session', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))
  const login = ref(localStorage.getItem(LOGIN_KEY) ?? '')
  const account = ref<Account | null>(readAccount())
  const onboarded = ref(localStorage.getItem(ONBOARD_KEY) === '1')
  const returnPath = ref('/scenarios')
  const greetOnEntry = ref(Boolean(token.value && login.value))

  function persist() {
    if (token.value) localStorage.setItem(TOKEN_KEY, token.value)
    else localStorage.removeItem(TOKEN_KEY)
    localStorage.setItem(LOGIN_KEY, login.value)
    if (account.value) localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account.value))
    else localStorage.removeItem(ACCOUNT_KEY)
    localStorage.setItem(ONBOARD_KEY, onboarded.value ? '1' : '0')
    syncToken(token.value)
  }

  function applyAuth(nextToken: string, nextAccount: Account, nextLogin: string) {
    token.value = nextToken
    account.value = nextAccount
    login.value = nextLogin
    if (nextAccount.display_name) onboarded.value = true
    persist()
  }

  function clear() {
    token.value = null
    account.value = null
    login.value = ''
    onboarded.value = false
    greetOnEntry.value = false
    persist()
  }

  async function signIn(name: string, password: string) {
    const result = await getApi().signIn(name, password)
    applyAuth(result.token, result.account, name)
    greetOnEntry.value = true
  }

  async function signUp(name: string, password: string) {
    const result = await getApi().signUp(name, password)
    applyAuth(result.token, result.account, name)
    greetOnEntry.value = false
  }

  async function guest() {
    const result = await getApi().guest()
    applyAuth(result.token, result.account, '')
    greetOnEntry.value = false
  }

  async function upgrade(name: string, password: string) {
    const result = await getApi().upgrade(name, password)
    applyAuth(result.token, result.account, name)
  }

  async function signOut() {
    try {
      await getApi().signOut()
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) throw error
    }
    clear()
  }

  async function refresh() {
    if (!token.value) return
    const result = await getApi().getAccount()
    account.value = result.account
    persist()
  }

  async function saveProfile(displayName: string, spheres: SphereId[]) {
    const result = await getApi().patchAccount({ display_name: displayName, spheres })
    account.value = result.account
    onboarded.value = true
    persist()
  }

  function skipOnboarding() {
    onboarded.value = true
    persist()
  }

  function noteReturn(path: string) {
    returnPath.value = path
  }

  const isAuthenticated = computed(() => Boolean(token.value))

  persist()

  return {
    token,
    login,
    account,
    onboarded,
    returnPath,
    greetOnEntry,
    isAuthenticated,
    signIn,
    signUp,
    guest,
    upgrade,
    signOut,
    refresh,
    saveProfile,
    skipOnboarding,
    noteReturn,
    clear,
  }
})

export function installApiAuth(onUnauthorized: () => void) {
  const session = useSessionStore()
  configureApi(() => session.token, onUnauthorized)
  syncToken(session.token)
}
