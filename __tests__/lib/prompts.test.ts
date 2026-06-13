import { createBriefingSystemPrompt, createBriefingUserPrompt, createChatSystemPrompt } from '@/lib/prompts'
import type { WorldBankIndicator, Briefing } from '@/types'

const mockIndicators: WorldBankIndicator[] = [
  { code: 'NY.GDP.MKTP.KD.ZG', name: 'GDP growth (annual %)', value: 5.1, year: 2023, unit: '%' },
  { code: 'FP.CPI.TOTL.ZG', name: 'Inflation (CPI)', value: 3.7, year: 2023, unit: '%' },
]

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
}

describe('createBriefingSystemPrompt', () => {
  it('returns a non-empty string', () => {
    const prompt = createBriefingSystemPrompt()
    expect(typeof prompt).toBe('string')
    expect(prompt.length).toBeGreaterThan(100)
  })

  it('instructs JSON output', () => {
    expect(createBriefingSystemPrompt().toLowerCase()).toContain('json')
  })
})

describe('createBriefingUserPrompt', () => {
  it('includes country name', () => {
    const prompt = createBriefingUserPrompt('Indonesia', 'ID', mockIndicators)
    expect(prompt).toContain('Indonesia')
  })

  it('includes actual indicator value', () => {
    const prompt = createBriefingUserPrompt('Indonesia', 'ID', mockIndicators)
    expect(prompt).toContain('5.1')
  })

  it('instructs not to invent numbers', () => {
    const prompt = createBriefingUserPrompt('Indonesia', 'ID', mockIndicators)
    expect(prompt).toMatch(/do not invent|use these exact/i)
  })
})

describe('createChatSystemPrompt', () => {
  it('includes country name from briefing', () => {
    const prompt = createChatSystemPrompt(mockBriefing, mockIndicators)
    expect(prompt).toContain('Indonesia')
  })

  it('includes indicator value in context block', () => {
    const prompt = createChatSystemPrompt(mockBriefing, mockIndicators)
    expect(prompt).toContain('5.1')
  })
})
