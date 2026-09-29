import { onUnmounted, watch } from 'vue'

export interface MainAction {
  text: string
  onClick: () => void
  enabled?: boolean
  progress?: boolean
}

let generation = 0
let mainClick: (() => void) | null = null
let backClick: (() => void) | null = null

export interface TelegramProfile {
  id: number
  firstName: string
  lastName: string
  username: string
}

export function inTelegram() {
  return Boolean(window.Telegram?.WebApp)
}

export function readTelegramProfile(): TelegramProfile | null {
  const user = window.Telegram?.WebApp?.initDataUnsafe?.user
  if (!user?.id) return null
  return {
    id: user.id,
    firstName: user.first_name ?? '',
    lastName: user.last_name ?? '',
    username: user.username ?? '',
  }
}

export function telegramDisplayName(profile: TelegramProfile) {
  return [profile.firstName, profile.lastName].filter(Boolean).join(' ') || profile.username || 'Участник'
}

export function closeMiniApp() {
  window.Telegram?.WebApp?.close()
}

function hideTelegramButtons() {
  const app = window.Telegram?.WebApp
  if (!app) return
  if (mainClick) app.MainButton.offClick(mainClick)
  mainClick = null
  app.MainButton.hideProgress()
  app.MainButton.hide()
  if (backClick) app.BackButton.offClick(backClick)
  backClick = null
  app.BackButton.hide()
}

export function initTelegram() {
  const app = window.Telegram?.WebApp
  if (!app) return
  document.documentElement.classList.add('tg-app')
  app.ready()
  app.expand()
  app.setHeaderColor('#c5daf8')
  app.setBackgroundColor('#f5f7fb')
  app.setBottomBarColor?.('#ffffff')
  hideTelegramButtons()
}

export function setMainButton(_action: MainAction | null) {
  hideTelegramButtons()
}

export function setBackButton(_onBack: (() => void) | null) {
  hideTelegramButtons()
}

export function useTelegramButtons(read: () => { main: MainAction | null; back: (() => void) | null }) {
  const id = ++generation
  watch(read, () => {
    if (id !== generation) return
    const state = read()
    setMainButton(state.main)
    setBackButton(state.back)
  }, { immediate: true })
  onUnmounted(() => {
    if (id !== generation) return
    setMainButton(null)
    setBackButton(null)
  })
}
