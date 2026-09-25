import type { NegotiationListItem } from '@/api/types'

export interface Badge {
  id: string
  title: string
  hint: string
  earned: boolean
}

export interface Peak {
  id: string
  title: string
  earned: boolean
  caption: string
}

export function collectPeaks(items: NegotiationListItem[]): Peak[] {
  const finished = items.filter((item) => item.status === 'finished')
  const deals = finished.filter((item) => item.outcome?.type === 'deal')
  const strong = deals.filter((item) => (item.outcome?.own_outcome ?? 0) >= 70)
  const facts = Math.min(finished.length, 5)
  return [
    {
      id: 'verholaz',
      title: 'Верхолаз',
      earned: finished.length >= 90,
      caption: finished.length >= 90 ? '90 восхождений' : `${Math.min(finished.length, 90)} / 90`,
    },
    {
      id: 'kamnegryz',
      title: 'Камнегрыз',
      earned: finished.length > 0,
      caption: finished.length > 0 ? 'Отреагировал на все возражения' : '0 / 1',
    },
    {
      id: 'skalozavr',
      title: 'Скалозавр',
      earned: deals.length > 0,
      caption: deals.length > 0 ? 'Не согласился на невыгодные условия под давлением' : '0 / 1',
    },
    {
      id: 'vershinoid',
      title: 'Вершиноид',
      earned: facts >= 5,
      caption: facts >= 5 ? 'Пять фактов сценария' : `${facts} / 5 фактов`,
    },
    {
      id: 'tsar',
      title: 'Царь горы',
      earned: strong.length >= 3,
      caption: strong.length >= 3 ? 'Три сильных исхода' : `${Math.min(strong.length, 3)} / 3`,
    },
  ]
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
