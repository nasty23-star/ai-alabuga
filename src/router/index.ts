import { createRouter, createWebHistory } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import AuthView from '@/views/AuthView.vue'
import ChatView from '@/views/ChatView.vue'
import DebriefView from '@/views/DebriefView.vue'
import HistoryView from '@/views/HistoryView.vue'
import OnboardingView from '@/views/OnboardingView.vue'
import ScenariosView from '@/views/ScenariosView.vue'
import SettingsView from '@/views/SettingsView.vue'
import SharedView from '@/views/SharedView.vue'
import WizardView from '@/views/WizardView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/auth', name: 'auth', component: AuthView, meta: { public: true, bare: true } },
    { path: '/onboarding', name: 'onboarding', component: OnboardingView, meta: { bare: true } },
    { path: '/', redirect: '/scenarios' },
    { path: '/scenarios', name: 'scenarios', component: ScenariosView },
    { path: '/wizard/:scenarioId?', name: 'wizard', component: WizardView },
    { path: '/negotiations/:id', name: 'chat', component: ChatView },
    { path: '/negotiations/:id/debrief', name: 'debrief', component: DebriefView },
    { path: '/history', name: 'history', component: HistoryView },
    { path: '/settings', name: 'settings', component: SettingsView },
    { path: '/s/:token', name: 'shared', component: SharedView, meta: { public: true, bare: true } },
  ],
})

router.beforeEach((to) => {
  const session = useSessionStore()
  if (to.meta.public) {
    if (to.name === 'auth' && session.isAuthenticated) return session.onboarded ? '/scenarios' : '/onboarding'
    return true
  }
  if (!session.isAuthenticated) {
    session.noteReturn(to.fullPath)
    return { name: 'auth', query: { next: to.fullPath } }
  }
  if (!session.onboarded && to.name !== 'onboarding') return { name: 'onboarding' }
  return true
})

export default router
