import { render, screen } from '@testing-library/react'
import ChatInterface from '@/app/components/ChatInterface'
import type { Briefing } from '@/types'

const mockBriefing: Briefing = {
  title: 'Test Briefing',
  executive_summary: 'Summary.',
  key_indicators: [],
  risks: [],
  opportunities: [],
  what_to_watch: [],
  bottom_line: 'Bottom line.',
  generated_at: new Date().toISOString(),
  country_code: 'ID',
  country_name: 'Indonesia',
  data_year: 2023,
}

describe('ChatInterface', () => {
  it('renders the chat input', () => {
    render(<ChatInterface briefing={mockBriefing} worldBankData={[]} />)
    expect(screen.getByPlaceholderText(/ask about/i)).toBeInTheDocument()
  })

  it('shows welcome message with suggested questions', () => {
    render(<ChatInterface briefing={mockBriefing} worldBankData={[]} />)
    expect(screen.getByText(/ask me anything/i)).toBeInTheDocument()
  })

  it('disables input when disabled prop is true', () => {
    render(<ChatInterface briefing={mockBriefing} worldBankData={[]} disabled />)
    expect(screen.getByPlaceholderText(/ask about/i)).toBeDisabled()
  })

  it('shows country name in header', () => {
    render(<ChatInterface briefing={mockBriefing} worldBankData={[]} />)
    expect(screen.getByText(/Indonesia/)).toBeInTheDocument()
  })
})
