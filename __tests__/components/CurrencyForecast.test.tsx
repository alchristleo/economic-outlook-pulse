import { render, screen } from '@testing-library/react'
import CurrencyForecast from '@/app/components/CurrencyForecast'
import type { CurrencyForecastData } from '@/types'

// Recharts uses ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

const historical = Array.from({ length: 24 }, (_, i) => ({
  month: `2024-${String(i % 12 + 1).padStart(2, '0')}`,
  rate: 15000 + i * 50,
}))

const mockForecast: CurrencyForecastData = {
  currencyCode: 'IDR',
  historical,
  forecast: Array.from({ length: 12 }, (_, i) => ({
    month: `2025-${String(i + 1).padStart(2, '0')}`,
    rate: 16200 + i * 30,
  })),
  forecastCI: {
    upper: Array.from({ length: 12 }, (_, i) => 16500 + i * 30),
    lower: Array.from({ length: 12 }, (_, i) => 15900 + i * 30),
  },
  regressionSlope: 50,
  rSquared: 0.92,
}

describe('CurrencyForecast', () => {
  it('renders section heading', () => {
    render(<CurrencyForecast data={mockForecast} />)
    expect(screen.getByText(/IDR\/USD/i)).toBeInTheDocument()
  })

  it('renders R² quality badge', () => {
    render(<CurrencyForecast data={mockForecast} />)
    expect(screen.getByText(/R²/)).toBeInTheDocument()
    expect(screen.getByText(/0\.920/)).toBeInTheDocument()
  })

  it('renders trend direction text', () => {
    render(<CurrencyForecast data={mockForecast} />)
    // slope 50 = depreciation (more IDR per USD over time)
    expect(screen.getByText(/depreciat/i)).toBeInTheDocument()
  })

  it('renders disclaimer note', () => {
    render(<CurrencyForecast data={mockForecast} />)
    expect(screen.getByText(/linear trend model/i)).toBeInTheDocument()
  })
})
