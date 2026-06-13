export interface WorldBankIndicator {
  code: string
  name: string
  value: number | null
  year: number | null
  unit: string
}

export interface DimensionScore {
  name: string
  score: number   // 0–100
  weight: number  // e.g. 0.25
}

export type Sentiment = 'strong' | 'moderate' | 'weak' | 'vulnerable'

export interface EconomicHealthScore {
  composite: number       // 0–100
  sentiment: Sentiment
  dimensions: DimensionScore[]
}

export interface Briefing {
  title: string
  executive_summary: string
  key_indicators: WorldBankIndicator[]
  risks: string[]
  opportunities: string[]
  what_to_watch: string[]
  bottom_line: string
  generated_at: string
  country_code: string
  country_name: string
  data_year: number | null
  health_score: EconomicHealthScore
  exchange_rate: { currency: string; rate: number } | null
}

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatRequest {
  messages: Message[]
  briefing: Briefing
  worldBankData: WorldBankIndicator[]
}

export interface GenerateBriefRequest {
  countryCode: string  // name derived server-side from COUNTRIES allowlist
}

export interface Country {
  code: string
  name: string
  region?: string
}
