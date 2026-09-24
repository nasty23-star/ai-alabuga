export function initTelegram() {
  const app = window.Telegram?.WebApp
  if (!app) return
  app.ready()
  app.expand()
  app.setHeaderColor('#1f7a4d')
  app.setBackgroundColor('#f3f6f4')
}

export function bindBackButton(visible: boolean, onBack: () => void) {
  const button = window.Telegram?.WebApp?.BackButton
  if (!button) return
  button.offClick(onBack)
  if (visible) {
    button.onClick(onBack)
    button.show()
  } else {
    button.hide()
  }
}
