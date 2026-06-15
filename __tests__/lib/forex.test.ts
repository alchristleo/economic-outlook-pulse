import {
  linearRegression,
  forecastPoints,
  sampleMonthlyRates,
} from '@/lib/forex'
import type { MonthlyRate } from '@/types'

describe('linearRegression', () => {
  it('returns exact slope and intercept for perfect linear data', () => {
    const points = [
      { x: 0, y: 10000 },
      { x: 1, y: 10100 },
      { x: 2, y: 10200 },
      { x: 3, y: 10300 },
    ]
    const reg = linearRegression(points)
    expect(reg.slope).toBeCloseTo(100, 2)
    expect(reg.intercept).toBeCloseTo(10000, 2)
    expect(reg.rSquared).toBeCloseTo(1, 4)
    expect(reg.residualStd).toBeCloseTo(0, 4)
  })

  it('computes rSquared < 1 for noisy data', () => {
    const points = [
      { x: 0, y: 10000 },
      { x: 1, y: 10500 },
      { x: 2, y: 9800 },
      { x: 3, y: 10300 },
    ]
    const reg = linearRegression(points)
    expect(reg.rSquared).toBeGreaterThan(0)
    expect(reg.rSquared).toBeLessThan(1)
  })
})

describe('forecastPoints', () => {
  it('returns the requested number of forecast steps', () => {
    const points = Array.from({ length: 24 }, (_, i) => ({ x: i, y: 15000 + i * 50 }))
    const reg = linearRegression(points)
    const result = forecastPoints(reg, 24, 12, points.length)
    expect(result).toHaveLength(12)
  })

  it('CI upper > predicted > CI lower', () => {
    const points = Array.from({ length: 24 }, (_, i) => ({
      x: i,
      y: 15000 + i * 50 + (Math.random() - 0.5) * 200,
    }))
    const reg = linearRegression(points)
    const result = forecastPoints(reg, 24, 12, points.length)
    result.forEach(({ value, upper, lower }) => {
      expect(upper).toBeGreaterThan(value)
      expect(lower).toBeLessThan(value)
    })
  })

  it('CI interval widens over forecast horizon', () => {
    const points = Array.from({ length: 36 }, (_, i) => ({
      x: i,
      y: 15000 + i * 30 + (Math.random() - 0.5) * 300,
    }))
    const reg = linearRegression(points)
    const result = forecastPoints(reg, 36, 12, points.length)
    const firstSpread = result[0].upper - result[0].lower
    const lastSpread = result[11].upper - result[11].lower
    expect(lastSpread).toBeGreaterThan(firstSpread)
  })
})

describe('sampleMonthlyRates', () => {
  it('returns one rate per month, first available', () => {
    const rates: Record<string, Record<string, number>> = {
      '2024-01-02': { IDR: 15500 },
      '2024-01-03': { IDR: 15600 },
      '2024-02-01': { IDR: 15700 },
    }
    const result = sampleMonthlyRates(rates, 'IDR')
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ month: '2024-01', rate: 15500 })
    expect(result[1]).toEqual({ month: '2024-02', rate: 15700 })
  })

  it('returns sorted by month ascending', () => {
    const rates: Record<string, Record<string, number>> = {
      '2024-03-01': { IDR: 15900 },
      '2024-01-01': { IDR: 15500 },
      '2024-02-01': { IDR: 15700 },
    }
    const result = sampleMonthlyRates(rates, 'IDR')
    expect(result.map(r => r.month)).toEqual(['2024-01', '2024-02', '2024-03'])
  })
})
