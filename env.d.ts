/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_MODE: 'mock' | 'http'
  readonly VITE_API_BASE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface TelegramButton {
  show: () => void
  hide: () => void
  onClick: (cb: () => void) => void
  offClick: (cb: () => void) => void
}

interface TelegramMainButton extends TelegramButton {
  setText: (text: string) => void
  enable: () => void
  disable: () => void
  showProgress: (leaveActive?: boolean) => void
  hideProgress: () => void
  setParams: (params: { color?: string; text_color?: string; is_active?: boolean; is_visible?: boolean }) => void
}

interface TelegramWebApp {
  ready: () => void
  expand: () => void
  setHeaderColor: (color: string) => void
  setBackgroundColor: (color: string) => void
  BackButton: TelegramButton
  MainButton: TelegramMainButton
  openTelegramLink?: (url: string) => void
  themeParams: Record<string, string | undefined>
  initData: string
}

interface Window {
  Telegram?: { WebApp: TelegramWebApp }
}
