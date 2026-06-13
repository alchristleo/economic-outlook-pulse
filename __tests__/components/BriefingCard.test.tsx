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
  risks: ['Commodity price volatility', 'Weak global demand'],
  opportunities: ['Nickel supply chain position'],
  what_to_watch: ['Bank Indonesia rate decisions'],
  bottom_line: "Indonesia's fundamentals remain sound.",
  generated_at: '2024-01-15T10:30:00Z',
  country_code: 'ID',
  country_name: 'Indonesia',
  data_year: 2023,
}

describe('BriefingCard', () => {
  it('renders the title', () => {
    render(<BriefingCard briefing={mockBriefing} indicators={mockIndicators} />)
    expect(screen.getByText('Indonesia: Steady as She Goes')).toBeInTheDocument()
  })

  it('renders the executive summary', () => {
    render(<BriefingCard briefing={mockBriefing} indicators={mockIndicators} />)
    expect(screen.getByText(/commodity headwinds/i)).toBeInTheDocument()
  })

  it('renders a risk item', () => {
    render(<BriefingCard briefing={mockBriefing} indicators={mockIndicators} />)
    expect(screen.getByText('Commodity price volatility')).toBeInTheDocument()
  })

  it('renders the bottom line', () => {
    render(<BriefingCard briefing={mockBriefing} indicators={mockIndicators} />)
    expect(screen.getByText(/fundamentals remain sound/i)).toBeInTheDocument()
  })

  it('shows Prototype badge', () => {
    render(<BriefingCard briefing={mockBriefing} indicators={mockIndicators} />)
    expect(screen.getByText(/prototype/i)).toBeInTheDocument()
  })

  it('shows data year', () => {
    render(<BriefingCard briefing={mockBriefing} indicators={mockIndicators} />)
    expect(screen.getByText(/2023/)).toBeInTheDocument()
  })
})
