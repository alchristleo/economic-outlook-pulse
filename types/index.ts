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
  // weights in dimensions must sum to 1.0
  dimensions: DimensionScore[]
}

export type ConfidenceLevel = 'high' | 'medium' | 'low'

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
  confidence: ConfidenceLevel
  data_quality_note?: string
  suggested_questions?: string[]  // LLM-generated, country-specific chat starters
}

export interface Message {
  role: 'user' | 'assistant'
  content: string
  comparisonData?: ComparisonData
}

export interface ComparisonCountry {
  code: string
  name: string
  indicators: WorldBankIndicator[]
}

export interface ComparisonData {
  base_country_code: string
  countries: ComparisonCountry[]  // 1–3 comparison countries
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

export interface MonthlyRate {
  month: string  // ISO "YYYY-MM"
  rate: number   // local currency units per 1 USD
}

export interface ConfidenceInterval {
  upper: number[]  // parallel to forecast[]
  lower: number[]
}

export interface CurrencyForecastData {
  currencyCode: string
  historical: MonthlyRate[]
  forecast: MonthlyRate[]
  forecastCI: ConfidenceInterval
  regressionSlope: number  // LCU/month trend direction
  rSquared: number         // model fit quality 0–1
}

export interface ScenarioResult {
  hypothesis_summary: string
  chain_of_effects: string[]      // 3-4 ordered causal steps
  revised_risks: string[]         // 2-3 risks under this scenario
  revised_opportunities: string[] // 1-2 opportunities
  bottom_line: string
}

export interface ScenarioRequest {
  countryCode: string
  hypothesis: string
  briefing: Briefing
}

export interface DebateResult {
  bull_case: string[]  // exactly 3 arguments
  bear_case: string[]  // exactly 3 arguments
  verdict: string      // one sentence: who wins and why
}

export type LensType = 'bond' | 'equity' | 'central_bank'

export interface LensResult {
  lens: LensType
  headline: string     // one sentence framing
  signals: string[]    // 3-4 lens-specific observations
  key_risk: string     // biggest risk for this investor type
  bottom_line: string  // one sentence verdict
}

export interface NewsArticle {
  title: string
  url: string
}

export interface NewsCheckResult {
  articles_used: number
  corroborations: string[]  // 2-3
  contradictions: string[]  // 1-2
  overall: string           // one sentence synthesis
}
