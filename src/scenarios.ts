import type { ScenarioTheme, SphereId } from '@/api/types'

/** Роль по умолчанию для темы: не брать variants[0] (там почти всегда закупки). */
const PREFERRED_SPHERE: Record<string, SphereId> = {
  order_placement: 'procurement',
  contractor_discount: 'procurement',
  salary_raise: 'management',
  contract_renewal: 'sales',
  project_budget: 'founder',
}

export function scenarioVariant(theme: ScenarioTheme, spheres: SphereId[]) {
  const preferred = PREFERRED_SPHERE[theme.theme]
  const allowed = spheres.length
    ? theme.variants.filter((variant) => spheres.includes(variant.sphere))
    : theme.variants
  const pool = allowed.length ? allowed : theme.variants
  if (preferred) {
    const match = pool.find((variant) => variant.sphere === preferred)
    if (match) return match
  }
  return pool[0]
}
