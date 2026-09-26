import orderPlacement from '@/assets/onboarding/order-placement.svg?raw'
import contractorDiscount from '@/assets/onboarding/contractor-discount.svg?raw'
import salaryRaise from '@/assets/onboarding/salary-raise.svg?raw'
import contractRenewal from '@/assets/onboarding/contract-renewal.svg?raw'
import projectBudget from '@/assets/onboarding/project-budget.svg?raw'

export const scenarioIcons: Record<string, { bg: string; color: string; svg: string }> = {
  order_placement: {
    bg: '#e8f0ff',
    color: '#1a5cff',
    svg: orderPlacement,
  },
  contractor_discount: {
    bg: '#fde8ef',
    color: '#e11d48',
    svg: contractorDiscount,
  },
  salary_raise: {
    bg: '#e7f8ee',
    color: '#16a34a',
    svg: salaryRaise,
  },
  contract_renewal: {
    bg: '#fff4d6',
    color: '#d97706',
    svg: contractRenewal,
  },
  project_budget: {
    bg: '#eee8ff',
    color: '#7c3aed',
    svg: projectBudget,
  },
}

export function scenarioIcon(theme: string | undefined) {
  return scenarioIcons[theme ?? ''] ?? scenarioIcons.order_placement
}
