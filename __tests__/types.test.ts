import type { Briefing, Message, WorldBankIndicator, ChatRequest, GenerateBriefRequest, Country, EconomicHealthScore, DimensionScore } from '@/types'

const indicator: WorldBankIndicator = {
  code: 'NY.GDP.MKTP.KD.ZG',
  name: 'GDP growth (annual %)',
  value: 5.3,
  year: 2023,
  unit: '%',
}

const message: Message = {
  role: 'user',
  content: 'What about inflation?',
}

const briefing: Briefing = {
  title: 'Indonesia: Steady Growth',
  executive_summary: 'Southeast Asia...',
  key_indicators: [indicator],
  risks: ['Commodity price volatility'],
  opportunities: ['Digital economy expansion'],
  what_to_watch: ['Bank Indonesia rate decisions'],
  bottom_line: 'Cautiously optimistic.',
  generated_at: new Date().toISOString(),
  country_code: 'ID',
  country_name: 'Indonesia',
  data_year: 2023,
  health_score: {
    composite: 68,
    sentiment: 'moderate' as const,
    dimensions: [
      { name: 'Economic Momentum', score: 7, weight: 0.25 },
      { name: 'Monetary Health', score: 8, weight: 0.20 },
      { name: 'Fiscal Position', score: 8, weight: 0.20 },
      { name: 'External Balance', score: 6, weight: 0.20 },
      { name: 'Institutional Quality', score: 5, weight: 0.15 },
    ],
  },
  exchange_rate: null,
  confidence: 'high',
}

const country: Country = { code: 'ID', name: 'Indonesia' }

test('types compile and hold expected values', () => {
  expect(indicator.code).toBe('NY.GDP.MKTP.KD.ZG')
  expect(briefing.title).toBeDefined()
  expect(message.role).toBe('user')
  expect(country.code).toBe('ID')
})

test('DimensionScore holds name and score', () => {
  const d: DimensionScore = { name: 'Economic Momentum', score: 7, weight: 0.25 }
  expect(d.score).toBe(7)
})

test('EconomicHealthScore holds composite and dimensions', () => {
  const h: EconomicHealthScore = {
    composite: 65,
    sentiment: 'moderate',
    dimensions: [
      { name: 'Economic Momentum', score: 72, weight: 0.25 },
      { name: 'Monetary Health', score: 58, weight: 0.20 },
      { name: 'Fiscal Position', score: 60, weight: 0.20 },
      { name: 'External Balance', score: 63, weight: 0.20 },
      { name: 'Institutional Quality', score: 71, weight: 0.15 },
    ],
  }
  expect(h.composite).toBe(65)
  expect(h.sentiment).toBe('moderate')
})
