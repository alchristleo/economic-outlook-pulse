import { createBriefingSystemPrompt, createBriefingUserPrompt, createChatSystemPrompt } from '@/lib/prompts'
import type { WorldBankIndicator, Briefing, EconomicHealthScore } from '@/types'

const mockIndicators: WorldBankIndicator[] = [
  { code: 'NY.GDP.MKTP.KD.ZG', name: 'GDP growth (annual %)', value: 5.1, year: 2023, unit: '%' },
  { code: 'FP.CPI.TOTL.ZG', name: 'Inflation (CPI)', value: 3.7, year: 2023, unit: '%' },
  { code: 'GC.DOD.TOTL.GD.ZS', name: 'Government debt (% of GDP)', value: 39.0, year: 2023, unit: '%' },
]

const mockHealthScore: EconomicHealthScore = {
  composite: 68,
  sentiment: 'moderate',
  dimensions: [
    { name: 'Economic Momentum', score: 7, weight: 0.25 },
    { name: 'Monetary Health', score: 8, weight: 0.20 },
    { name: 'Fiscal Position', score: 8, weight: 0.20 },
    { name: 'External Balance', score: 6, weight: 0.20 },
    { name: 'Institutional Quality', score: 5, weight: 0.15 },
  ],
}

const mockBriefing: Briefing = {
  title: 'Indonesia: A Steady Hand',
  executive_summary: "Southeast Asia's largest economy navigates headwinds.",
  key_indicators: mockIndicators,
  risks: ['Commodity dependence'],
  opportunities: ['Nickel supply chain'],
  what_to_watch: ['Bank Indonesia rates'],
  bottom_line: 'Cautious optimism warranted.',
  generated_at: '2024-01-01T00:00:00Z',
  country_code: 'ID',
  country_name: 'Indonesia',
  data_year: 2023,
  health_score: mockHealthScore,
  exchange_rate: { currency: 'IDR', rate: 15800 },
}

describe('createBriefingSystemPrompt', () => {
  it('returns a non-empty string', () => {
    expect(createBriefingSystemPrompt().length).toBeGreaterThan(100)
  })

  it('instructs JSON output', () => {
    expect(createBriefingSystemPrompt().toLowerCase()).toContain('json')
  })

  it('includes Economist voice instruction', () => {
    expect(createBriefingSystemPrompt()).toMatch(/economist|authoritative|dry/i)
  })
})

describe('createBriefingUserPrompt', () => {
  it('includes country name', () => {
    expect(createBriefingUserPrompt('Indonesia', 'ID', mockIndicators, mockHealthScore)).toContain('Indonesia')
  })

  it('includes indicator value', () => {
    expect(createBriefingUserPrompt('Indonesia', 'ID', mockIndicators, mockHealthScore)).toContain('5.1')
  })

  it('instructs not to invent numbers', () => {
    expect(createBriefingUserPrompt('Indonesia', 'ID', mockIndicators, mockHealthScore)).toMatch(/do not invent|use these exact/i)
  })

  it('includes composite score', () => {
    expect(createBriefingUserPrompt('Indonesia', 'ID', mockIndicators, mockHealthScore)).toContain('68')
  })

  it('includes sentiment', () => {
    expect(createBriefingUserPrompt('Indonesia', 'ID', mockIndicators, mockHealthScore)).toContain('moderate')
  })
})

describe('createChatSystemPrompt', () => {
  it('includes country name from briefing', () => {
    expect(createChatSystemPrompt(mockBriefing, mockIndicators)).toContain('Indonesia')
  })

  it('includes health score', () => {
    expect(createChatSystemPrompt(mockBriefing, mockIndicators)).toContain('68')
  })

  it('includes what_to_watch', () => {
    expect(createChatSystemPrompt(mockBriefing, mockIndicators)).toContain('Bank Indonesia rates')
  })
})
