import { render, screen } from '@testing-library/react'
import IndicatorChart from '@/app/components/IndicatorChart'
import type { WorldBankIndicator } from '@/types'

global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

const mockIndicators: WorldBankIndicator[] = [
  { code: 'NY.GDP.MKTP.KD.ZG', name: 'GDP growth (annual %)', value: 5.1, year: 2023, unit: '%' },
  { code: 'FP.CPI.TOTL.ZG', name: 'Inflation (CPI)', value: 3.7, year: 2023, unit: '%' },
]

describe('IndicatorChart', () => {
  it('renders indicator names', () => {
    render(<IndicatorChart indicators={mockIndicators} />)
    expect(screen.getByText(/GDP growth/i)).toBeInTheDocument()
  })

  it('renders formatted value', () => {
    render(<IndicatorChart indicators={mockIndicators} />)
    expect(screen.getByText('5.1%')).toBeInTheDocument()
  })

  it('renders N/A for null value', () => {
    const nullIndicator: WorldBankIndicator = {
      code: 'SL.UEM.TOTL.ZS',
      name: 'Unemployment',
      value: null,
      year: null,
      unit: '%',
    }
    render(<IndicatorChart indicators={[nullIndicator]} />)
    expect(screen.getByText('N/A')).toBeInTheDocument()
  })
})
