import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useSessionStore } from './session'

export const GAMIFICATION_LOGINS = ['Okotw', 'ProjectMafia']

function storageKey(login: string) {
  return `arena-gamification:${login}`
}

export const useGamificationStore = defineStore('gamification', () => {
  const session = useSessionStore()
  const enabled = ref(false)

  const allowed = computed(() => GAMIFICATION_LOGINS.includes(session.login))

  function hydrate() {
    enabled.value = allowed.value && localStorage.getItem(storageKey(session.login)) === '1'
  }

  function setEnabled(value: boolean) {
    if (!allowed.value) return
    enabled.value = value
    localStorage.setItem(storageKey(session.login), value ? '1' : '0')
  }

  const active = computed(() => allowed.value && enabled.value)

  return { allowed, enabled, active, hydrate, setEnabled }
})
