import { render, screen } from '@testing-library/react'
import BriefingCard from '@/app/components/BriefingCard'
import type { Briefing, WorldBankIndicator } from '@/types'

global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

const mockIndicators: WorldBankIndicator[] = [
  { code: 'NY.GDP.MKTP.KD.ZG', name: 'GDP growth', value: 5.1, year: 2023, unit: '%' },
]

const mockBriefing: Briefing = {
  title: 'Indonesia: Steady as She Goes',
  executive_summary: "Southeast Asia's largest economy navigates commodity headwinds.",
  key_indicators: mockIndicators,
  risks: ['Commodity price volatility'],
  opportunities: ['Nickel supply chain position'],
  what_to_watch: ['Bank Indonesia rate decisions'],
  bottom_line: "Indonesia's fundamentals remain sound.",
  generated_at: '2024-01-15T10:30:00Z',
  country_code: 'ID',
  country_name: 'Indonesia',
  data_year: 2023,
  health_score: {
    composite: 68,
    sentiment: 'moderate',
    dimensions: [
      { name: 'Economic Momentum', score: 7, weight: 0.25 },
      { name: 'Monetary Health', score: 8, weight: 0.20 },
      { name: 'Fiscal Position', score: 8, weight: 0.20 },
      { name: 'External Balance', score: 6, weight: 0.20 },
      { name: 'Institutional Quality', score: 5, weight: 0.15 },
    ],
  },
  exchange_rate: { currency: 'IDR', rate: 15800 },
  confidence: 'high',
}

describe('BriefingCard', () => {
  it('renders the title', () => {
    render(<BriefingCard briefing={mockBriefing} />)
    expect(screen.getByText('Indonesia: Steady as She Goes')).toBeInTheDocument()
  })

  it('renders the executive summary', () => {
    render(<BriefingCard briefing={mockBriefing} />)
    expect(screen.getByText(/commodity headwinds/i)).toBeInTheDocument()
  })

  it('renders health score', () => {
    render(<BriefingCard briefing={mockBriefing} />)
    expect(screen.getByText('68')).toBeInTheDocument()
  })

  it('renders sentiment label', () => {
    render(<BriefingCard briefing={mockBriefing} />)
    expect(screen.getByText(/moderate/i)).toBeInTheDocument()
  })

  it('renders a risk item', () => {
    render(<BriefingCard briefing={mockBriefing} />)
    expect(screen.getByText('Commodity price volatility')).toBeInTheDocument()
  })

  it('renders the bottom line', () => {
    render(<BriefingCard briefing={mockBriefing} />)
    expect(screen.getByText(/fundamentals remain sound/i)).toBeInTheDocument()
  })

  it('renders Prototype badge', () => {
    render(<BriefingCard briefing={mockBriefing} />)
    expect(screen.getByText(/prototype/i)).toBeInTheDocument()
  })

  it('renders exchange rate', () => {
    render(<BriefingCard briefing={mockBriefing} />)
    expect(screen.getByText(/IDR/)).toBeInTheDocument()
  })
})
