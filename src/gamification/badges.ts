import type { NegotiationListItem } from '@/api/types'

export interface Badge {
  id: string
  title: string
  hint: string
  earned: boolean
}

export function collectBadges(items: NegotiationListItem[]): Badge[] {
  const finished = items.filter((item) => item.status === 'finished')
  const deals = finished.filter((item) => item.outcome?.type === 'deal')
  const best = Math.max(0, ...deals.map((item) => item.outcome?.own_outcome ?? 0))
  return [
    { id: 'first-round', title: 'Первый раунд', hint: 'Завершить переговоры', earned: finished.length > 0 },
    { id: 'deal', title: 'Сделка', hint: 'Договориться по условиям', earned: deals.length > 0 },
    { id: 'strong', title: 'Сильный исход', hint: 'Выгода сделки от 70', earned: best >= 70 },
    { id: 'series', title: 'Серия', hint: 'Три завершённых прохождения', earned: finished.length >= 3 },
    { id: 'return', title: 'Ещё подход', hint: 'Вернуться к сценарию снова', earned: finished.length >= 2 },
  ]
}
