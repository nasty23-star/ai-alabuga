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

export function initTelegram() {
  const app = window.Telegram?.WebApp
  if (!app) return
  document.documentElement.classList.add('tg-app')
  app.ready()
  app.expand()
  app.setHeaderColor('#c5daf8')
  app.setBackgroundColor('#f5f7fb')
  app.setBottomBarColor?.('#ffffff')
  app.MainButton.setParams({ color: '#1a5cff', text_color: '#ffffff' })
}

export function setMainButton(action: MainAction | null) {
  const main = window.Telegram?.WebApp?.MainButton
  if (!main) return
  if (mainClick) main.offClick(mainClick)
  mainClick = null
  if (!action) {
    main.hideProgress()
    main.hide()
    return
  }
  main.setParams({ color: '#1a5cff', text_color: '#ffffff', is_active: action.enabled !== false })
  main.setText(action.text)
  if (action.progress) main.showProgress(false)
  else main.hideProgress()
  if (action.enabled === false) main.disable()
  else main.enable()
  mainClick = action.onClick
  main.onClick(mainClick)
  main.show()
}

export function setBackButton(onBack: (() => void) | null) {
  const back = window.Telegram?.WebApp?.BackButton
  if (!back) return
  if (backClick) back.offClick(backClick)
  backClick = null
  if (!onBack) {
    back.hide()
    return
  }
  backClick = onBack
  back.onClick(backClick)
  back.show()
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
