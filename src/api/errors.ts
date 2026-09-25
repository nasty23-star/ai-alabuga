export class ApiError extends Error {
  status: number
  code: string
  details: Record<string, unknown>

  constructor(status: number, code: string, message: string, details: Record<string, unknown> = {}) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

export function fail(status: number, code: string, message: string, details: Record<string, unknown> = {}): never {
  throw new ApiError(status, code, message, details)
}

const FIELD_LABEL: Record<string, string> = {
  display_name: 'имя',
  role: 'роль',
  formality: 'жёсткость',
  reply_length: 'разговорчивость',
  address_form: 'обращение',
  traits: 'черты',
  sample_phrases: 'возражения',
  source: 'источник',
  goal: 'цель переговоров',
  text: 'альтернатива',
}

function fieldPath(loc: unknown): string[] {
  if (!Array.isArray(loc)) return []
  return loc.filter((part): part is string => typeof part === 'string' && part !== 'body')
}

function explainIssue(loc: unknown, msg: string): string {
  const path = fieldPath(loc)
  const field = path.at(-1) ?? ''
  const label = FIELD_LABEL[field] ?? (field || 'поле')
  if (/at least 1 character|field required/i.test(msg)) {
    if (field === 'display_name') return 'Укажите имя'
    if (field === 'role') return 'Укажите роль после запятой, например «Ирина, CFO»'
    if (field === 'goal') return 'Укажите цель переговоров'
    if (field === 'text') return 'Укажите альтернативу — что будете делать, если не договоритесь'
    return `Укажите: ${label}`
  }
  const maxChars = /at most (\d+) character/i.exec(msg)
  if (maxChars) return `${label[0]?.toUpperCase() ?? ''}${label.slice(1)} — не длиннее ${maxChars[1]} символов`
  if (field === 'formality') return 'Жёсткость должна быть от 0 до 1'
  if (/input should be/i.test(msg)) return `Недопустимое значение: ${label}`
  return ''
}

export function explainApiError(error: ApiError, fallback: string): string {
  const raw = error.details.errors
  if (Array.isArray(raw)) {
    const lines = raw.flatMap((item) => {
      if (!item || typeof item !== 'object') return []
      const row = item as { loc?: unknown; msg?: unknown }
      const text = explainIssue(row.loc, typeof row.msg === 'string' ? row.msg : '')
      return text ? [text] : []
    })
    if (lines.length) return lines.join('. ')
  }
  if (error.message && error.message !== 'Тело запроса не прошло проверку') return error.message
  return fallback
}
