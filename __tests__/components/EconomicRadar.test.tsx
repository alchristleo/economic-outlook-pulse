import { render, screen } from '@testing-library/react'
import EconomicRadar from '@/app/components/EconomicRadar'
import type { EconomicHealthScore } from '@/types'

global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

const mockScore: EconomicHealthScore = {
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

describe('EconomicRadar', () => {
  it('renders composite score', () => {
    render(<EconomicRadar healthScore={mockScore} />)
    expect(screen.getByText('68')).toBeInTheDocument()
  })

  it('renders sentiment label', () => {
    render(<EconomicRadar healthScore={mockScore} />)
    expect(screen.getByText(/moderate/i)).toBeInTheDocument()
  })

  it('renders all 5 dimension names', () => {
    render(<EconomicRadar healthScore={mockScore} />)
    expect(screen.getByText(/Economic Momentum/i)).toBeInTheDocument()
    expect(screen.getByText(/Institutional Quality/i)).toBeInTheDocument()
  })
})
