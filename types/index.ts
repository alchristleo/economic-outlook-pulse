export interface WorldBankIndicator {
  code: string
  name: string
  value: number | null
  year: number | null
  unit: string
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
  countryCode: string
  countryName: string
}

export interface Country {
  code: string
  name: string
  region?: string
}
