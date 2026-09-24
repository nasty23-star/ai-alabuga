import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { installApiAuth, useSessionStore } from './stores/session'
import { initTelegram } from './telegram'
import './styles.css'

initTelegram()

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)
installApiAuth(() => {
  const session = useSessionStore()
  const next = router.currentRoute.value.fullPath
  session.clear()
  void router.push({ name: 'auth', query: { next } })
})
app.mount('#app')
