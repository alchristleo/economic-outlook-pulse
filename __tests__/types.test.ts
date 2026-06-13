import type { Briefing, Message, WorldBankIndicator, ChatRequest, GenerateBriefRequest, Country } from '@/types'

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
}

const country: Country = { code: 'ID', name: 'Indonesia' }

test('types compile and hold expected values', () => {
  expect(indicator.code).toBe('NY.GDP.MKTP.KD.ZG')
  expect(briefing.title).toBeDefined()
  expect(message.role).toBe('user')
  expect(country.code).toBe('ID')
})
