import { scoreIndicators, computeHealthScore } from '@/lib/scoring'
import type { WorldBankIndicator } from '@/types'

function ind(code: string, value: number | null): WorldBankIndicator {
  return { code, name: code, value, year: 2025, unit: '' }
}

describe('scoreIndicators — individual thresholds', () => {
  it('GDP growth 5% scores 7', () => {
    expect(scoreIndicators([ind('NGDP_RPCH', 5.0)])['NGDP_RPCH']).toBe(7)
  })

  it('GDP growth negative scores 0', () => {
    expect(scoreIndicators([ind('NGDP_RPCH', -1)])['NGDP_RPCH']).toBe(0)
  })

  it('inflation 3% scores 10', () => {
    expect(scoreIndicators([ind('PCPIPCH', 3)])['PCPIPCH']).toBe(10)
  })

  it('inflation 25% scores 0', () => {
    expect(scoreIndicators([ind('PCPIPCH', 25)])['PCPIPCH']).toBe(0)
  })

  it('govt debt 45% of GDP scores 8', () => {
    expect(scoreIndicators([ind('GGXWDG_NGDP', 45)])['GGXWDG_NGDP']).toBe(8)
  })

  it('fiscal surplus scores 10', () => {
    expect(scoreIndicators([ind('GGXCNL_NGDP', 3)])['GGXCNL_NGDP']).toBe(10)
  })

  it('unemployment 5% scores 6', () => {
    expect(scoreIndicators([ind('LUR', 5)])['LUR']).toBe(6)
  })

  it('null value returns null score', () => {
    expect(scoreIndicators([ind('NGDP_RPCH', null)])['NGDP_RPCH']).toBeNull()
  })
})

describe('computeHealthScore', () => {
  const indicators: WorldBankIndicator[] = [
    ind('NGDP_RPCH',   5.0),
    ind('NID_NGDP',    28.0),
    ind('PCPIPCH',     3.0),
    ind('GGXWDG_NGDP', 45),
    ind('GGXCNL_NGDP', -2.0),
    ind('BCA_NGDPD',   1.0),
    ind('TX_RPCH',     5.0),
    ind('LUR',         5.0),
  ]

  it('returns 5 dimensions', () => {
    expect(computeHealthScore(indicators).dimensions).toHaveLength(5)
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

  it('dimension names match IMF framework', () => {
    const names = computeHealthScore(indicators).dimensions.map((d) => d.name)
    expect(names).toContain('Economic Momentum')
    expect(names).toContain('Price Stability')
    expect(names).toContain('Fiscal Position')
    expect(names).toContain('External Balance')
    expect(names).toContain('Labor Market')
  })
})
