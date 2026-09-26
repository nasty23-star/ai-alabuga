import { createRouter, createWebHashHistory } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import AuthView from '@/views/AuthView.vue'
import ChatView from '@/views/ChatView.vue'
import DebriefView from '@/views/DebriefView.vue'
import GlossaryView from '@/views/GlossaryView.vue'
import HistoryView from '@/views/HistoryView.vue'
import ProgressView from '@/views/ProgressView.vue'
import OnboardingView from '@/views/OnboardingView.vue'
import PeaksView from '@/views/PeaksView.vue'
import ScenarioPickView from '@/views/ScenarioPickView.vue'
import ScenariosView from '@/views/ScenariosView.vue'
import SettingsView from '@/views/SettingsView.vue'
import SharedView from '@/views/SharedView.vue'
import WelcomeView from '@/views/WelcomeView.vue'
import WizardView from '@/views/WizardView.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/auth', name: 'auth', component: AuthView, meta: { public: true, bare: true } },
    { path: '/welcome', name: 'welcome', component: WelcomeView, meta: { bare: true } },
    { path: '/onboarding', name: 'onboarding', component: OnboardingView, meta: { bare: true } },
    { path: '/', redirect: '/scenarios' },
    { path: '/scenarios', name: 'scenarios', component: ScenariosView },
    { path: '/scenarios/pick', name: 'pick', component: ScenarioPickView },
    { path: '/wizard/:scenarioId?', name: 'wizard', component: WizardView },
    { path: '/negotiations/:id', name: 'chat', component: ChatView },
    { path: '/negotiations/:id/debrief', name: 'debrief', component: DebriefView },
    { path: '/history', name: 'history', component: HistoryView },
    { path: '/progress', name: 'progress', component: ProgressView },
    { path: '/glossary', name: 'glossary', component: GlossaryView },
    { path: '/peaks', name: 'peaks', component: PeaksView },
    { path: '/settings', name: 'settings', component: SettingsView },
    { path: '/s/:token', name: 'shared', component: SharedView, meta: { public: true, bare: true } },
  ],
})

let entryGreeted = false

function greetIfReturning(session: ReturnType<typeof useSessionStore>) {
  if (!session.greetOnEntry || !session.onboarded || entryGreeted) return null
  entryGreeted = true
  return { name: 'welcome' as const }
}

router.beforeEach((to) => {
  const session = useSessionStore()
  if (to.meta.public) {
    if (to.name === 'auth' && session.isAuthenticated) {
      if (!session.onboarded) return '/onboarding'
      return greetIfReturning(session) ?? '/scenarios'
    }
    return true
  }
  if (!session.isAuthenticated) {
    session.noteReturn(to.fullPath)
    return { name: 'auth', query: { next: to.fullPath } }
  }
  if (!session.onboarded && to.name !== 'onboarding') return { name: 'onboarding' }
  if (to.name === 'welcome') {
    entryGreeted = true
    return true
  }
  return greetIfReturning(session) ?? true
})

export default router
