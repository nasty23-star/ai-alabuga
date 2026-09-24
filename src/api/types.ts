export type SphereId = 'procurement' | 'sales' | 'hiring' | 'management' | 'founder'
export type Weight = 'low' | 'medium' | 'high'
export type Phase = 'opening' | 'exploration' | 'bargaining' | 'closing'
export type NegotiationStatus = 'active' | 'finished' | 'interrupted'
export type OutcomeType = 'deal' | 'partial_deal' | 'no_deal'
export type Zone = 'bad' | 'normal' | 'good'
export type AddressForm = 'formal' | 'informal'
export type ReplyLength = 'short' | 'medium' | 'long'
export type CounterpartSource = 'manual' | 'cognico'
export type Speaker = 'player' | 'counterpart'
export type MetricUnit = 'points' | 'percent' | 'count' | 'boolean'

export interface Account {
  id: string
  display_name: string
  is_guest: boolean
  spheres: SphereId[]
}

export interface AuthResponse {
  token: string
  account: Account
}

export interface IssueType {
  id: string
  name: string
  unit: string
  range: [number, number]
}

export interface SphereMeta {
  id: SphereId
  title: string
}

export interface ScenarioVariant {
  id: string
  sphere: SphereId
  seat: string
}

export interface ScenarioTheme {
  theme: string
  title: string
  tagline: string
  variants: ScenarioVariant[]
}

export interface ScenariosResponse {
  spheres: SphereMeta[]
  themes: ScenarioTheme[]
}

export interface IssueDraft {
  type_id: string
  reservation: number
  ideal: number
  weight: Weight
}

export interface Terms {
  goal: string
  issues: IssueDraft[]
  batna: { text: string }
  counterpart_note: string | null
  own_constraints: string | null
}

export interface ScenarioCard {
  id: string
  theme: string
  theme_title: string
  sphere: SphereId
  seat: string
  context: string
  hook: string
  roles: { player: string; counterpart: string }
  defaults: Terms
}

export interface Persona {
  id: string
  name: string
  tagline: string
  configured?: boolean
  source?: CounterpartSource
}

export interface CounterpartProfile {
  display_name: string
  role: string
  address_form: AddressForm
  reply_length: ReplyLength
  formality: number
  traits: string[]
  sample_phrases: string[]
  source: CounterpartSource
}

export interface CounterpartRef {
  persona_id: string
  name: string
  role?: string
}

export interface NegotiationLimits {
  turn_limit: number
  max_utterance_chars: number
}

export interface Turn {
  index: number
  speaker: Speaker
  text: string
  at: string
}

export interface AgreedTerm {
  type_id: string
  name: string
  value: number
  unit: string
}

export interface Outcome {
  type: OutcomeType
  own_outcome: number | null
  terms?: AgreedTerm[]
}

export interface NegotiationCreated {
  id: string
  phase: Phase
  turn_index: number
  turns_left: number
  counterpart: CounterpartRef
  terms: Terms
  opening_utterance: string
  limits: NegotiationLimits
}

export interface NegotiationState {
  id: string
  status: NegotiationStatus
  phase: Phase
  scenario: { id: string | null; title: string }
  counterpart: CounterpartRef
  terms: Terms
  turn_index: number
  turns_left: number
  turns: Turn[]
  limits: NegotiationLimits
  outcome: Outcome | null
  pending_deal: { terms: AgreedTerm[]; summary: string } | null
}

export interface NegotiationListItem {
  id: string
  status: NegotiationStatus
  theme_title: string
  seat: string
  counterpart: CounterpartRef
  started_at: string
  finished_at: string | null
  outcome: { type: OutcomeType; own_outcome: number | null } | null
}

export interface StartNegotiationBody {
  scenario_id: string | null
  persona_id: string
  terms: Terms
}

export type TurnEvent =
  | { event: 'thinking'; data: Record<string, never> }
  | { event: 'utterance_delta'; data: { text: string } }
  | { event: 'turn_committed'; data: { turn_index: number; phase: Phase; turns_left: number } }
  | { event: 'deal_proposed'; data: { terms: AgreedTerm[]; summary: string } }
  | { event: 'counterpart_left'; data: { reason: string } }
  | { event: 'turn_limit_reached'; data: Record<string, never> }
  | { event: 'stream_failed'; data: { code: string; message: string } }
  | { event: 'done'; data: { phase: Phase; status: NegotiationStatus } }

export interface TurnReplay {
  turn_index: number
  phase: Phase
  turns_left: number
  utterance: string
  deal_proposed?: { terms: AgreedTerm[]; summary: string }
}

export interface MetricOrigin {
  source_type: string
  formula_version: string
  threshold_source: 'academic' | 'practice' | 'expert_estimate' | 'arithmetic'
  is_estimated: boolean
}

export interface Metric {
  key: string
  title: string
  value?: number | boolean
  unit: MetricUnit
  zone: Zone
  available: boolean
  unavailable_reason?: string
  origin: MetricOrigin
}

export interface Guidance {
  kind: 'turning_point'
  claim: string
  effect: string
  advice: string
  evidence: { turn_index: number; quote: string }
}

export interface Debrief {
  outcome: Outcome
  metrics: Metric[]
  growth_areas: string[]
  guidance: Guidance[]
}

export interface SharedResult extends Debrief {
  transcript: Turn[] | null
  expires_at: string
}

export interface SharedLink {
  id: string
  url: string
  expires_at: string
}
