import { scoreIndicators, computeHealthScore } from '@/lib/scoring'
import type { WorldBankIndicator } from '@/types'

function ind(code: string, value: number | null): WorldBankIndicator {
  return { code, name: code, value, year: 2023, unit: '' }
}

describe('scoreIndicators — individual thresholds', () => {
  it('GDP growth 5% scores 7', () => {
    const result = scoreIndicators([ind('NY.GDP.MKTP.KD.ZG', 5.0)])
    expect(result['NY.GDP.MKTP.KD.ZG']).toBe(7)
  })

  it('GDP growth negative scores 0', () => {
    expect(scoreIndicators([ind('NY.GDP.MKTP.KD.ZG', -1)])['NY.GDP.MKTP.KD.ZG']).toBe(0)
  })

  it('inflation 3% scores 10', () => {
    expect(scoreIndicators([ind('FP.CPI.TOTL.ZG', 3)])['FP.CPI.TOTL.ZG']).toBe(10)
  })

  it('inflation 25% scores 0', () => {
    expect(scoreIndicators([ind('FP.CPI.TOTL.ZG', 25)])['FP.CPI.TOTL.ZG']).toBe(0)
  })

  it('govt debt 45% GDP scores 8', () => {
    expect(scoreIndicators([ind('GC.DOD.TOTL.GD.ZS', 45)])['GC.DOD.TOTL.GD.ZS']).toBe(8)
  })

  it('WGI rule of law 1.0 normalises correctly', () => {
    // (1.0 + 2.5) / 5 * 10 = 7
    expect(scoreIndicators([ind('RL.EST', 1.0)])['RL.EST']).toBe(7)
  })

  it('null value returns null score', () => {
    expect(scoreIndicators([ind('NY.GDP.MKTP.KD.ZG', null)])['NY.GDP.MKTP.KD.ZG']).toBeNull()
  })
})

describe('computeHealthScore', () => {
  const indicators: WorldBankIndicator[] = [
    ind('NY.GDP.MKTP.KD.ZG', 5.0),
    ind('NE.TRD.GNFS.ZS', 60),
    ind('FP.CPI.TOTL.ZG', 3.0),
    ind('FI.RES.TOTL.MO', 6.0),
    ind('GC.DOD.TOTL.GD.ZS', 45),
    ind('BN.CAB.XOKA.GD.ZS', 1.0),
    ind('BX.KLT.DINV.WD.GD.ZS', 2.0),
    ind('PV.EST', 0.5),
    ind('RL.EST', 1.0),
    ind('CC.EST', 0.0),
  ]

  it('returns 5 dimensions', () => {
    const result = computeHealthScore(indicators)
    expect(result.dimensions).toHaveLength(5)
  })

  it('composite is between 0 and 100', () => {
    const result = computeHealthScore(indicators)
    expect(result.composite).toBeGreaterThanOrEqual(0)
    expect(result.composite).toBeLessThanOrEqual(100)
  })

  it('returns a valid sentiment', () => {
    const result = computeHealthScore(indicators)
    expect(['strong', 'moderate', 'weak', 'vulnerable']).toContain(result.sentiment)
  })

  it('all-null indicators returns composite 0 and vulnerable', () => {
    const nullInds = indicators.map((i) => ({ ...i, value: null }))
    const result = computeHealthScore(nullInds)
    expect(result.composite).toBe(0)
    expect(result.sentiment).toBe('vulnerable')
  })
})
