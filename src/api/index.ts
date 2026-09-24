import { bindAuth, createHttpApi } from './http'
import { createMockApi } from './mock'

export type { Api } from './http'
export { ApiError } from './errors'

const tokenRef = { current: null as string | null }
let unauthorized = () => {}

const api = import.meta.env.VITE_API_MODE === 'http'
  ? createHttpApi()
  : createMockApi(() => tokenRef.current)

export function configureApi(getToken: () => string | null, onUnauthorized: () => void) {
  tokenRef.current = getToken()
  unauthorized = onUnauthorized
  bindAuth(() => tokenRef.current, () => unauthorized())
}

export function syncToken(token: string | null) {
  tokenRef.current = token
}

export function getApi() {
  return api
}
