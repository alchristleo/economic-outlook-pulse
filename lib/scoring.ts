import type { WorldBankIndicator, EconomicHealthScore, DimensionScore, Sentiment } from '@/types'

// ---------------------------------------------------------------------------
// Individual indicator scorers (all return 0–10)
// ---------------------------------------------------------------------------

function scoreGdpGrowth(v: number): number {
  if (v < 0)  return 0
  if (v < 1)  return 2
  if (v < 3)  return 5
  if (v <= 5) return 7
  if (v < 7)  return 8
  return 10
}

function scoreInflation(v: number): number {
  if (v < 0)   return 5   // deflation risk
  if (v < 2)   return 9
  if (v < 4)   return 10
  if (v < 6)   return 7
  if (v < 10)  return 5
  if (v < 20)  return 2
  return 0
}

function scoreGovtDebt(v: number): number {
  if (v < 30)  return 10
  if (v < 50)  return 8
  if (v < 70)  return 6
  if (v < 90)  return 4
  if (v < 120) return 2
  return 0
}

// Fiscal balance (% GDP): surplus positive, deficit negative
function scoreFiscalBalance(v: number): number {
  if (v >= 2)  return 10
  if (v >= 0)  return 7
  if (v >= -3) return 5
  if (v >= -5) return 3
  return 1
}

function scoreCurrentAccount(v: number): number {
  if (v >= 5)  return 10
  if (v >= 3)  return 8
  if (v >= 0)  return 6
  if (v >= -3) return 4
  if (v >= -5) return 2
  return 0
}

// Total investment % GDP: proxy for economic dynamism
function scoreInvestment(v: number): number {
  if (v >= 35) return 10
  if (v >= 28) return 8
  if (v >= 22) return 6
  if (v >= 16) return 4
  return 2
}

// Export volume growth %
function scoreExportGrowth(v: number): number {
  if (v >= 10) return 10
  if (v >= 5)  return 8
  if (v >= 2)  return 6
  if (v >= 0)  return 4
  return 1
}

// Unemployment rate: lower is better
function scoreUnemployment(v: number): number {
  if (v <= 2)  return 10
  if (v <= 4)  return 8
  if (v <= 6)  return 6
  if (v <= 10) return 4
  if (v <= 15) return 2
  return 0
}

// ---------------------------------------------------------------------------
// Scorer dispatch (IMF WEO indicator codes)
// ---------------------------------------------------------------------------

const SCORERS: Record<string, (v: number) => number> = {
  'NGDP_RPCH':   scoreGdpGrowth,
  'PCPIPCH':     scoreInflation,
  'GGXWDG_NGDP': scoreGovtDebt,
  'GGXCNL_NGDP': scoreFiscalBalance,
  'BCA_NGDPD':   scoreCurrentAccount,
  'NID_NGDP':    scoreInvestment,
  'TX_RPCH':     scoreExportGrowth,
  'LUR':         scoreUnemployment,
}

export function scoreIndicators(
  indicators: WorldBankIndicator[],
): Record<string, number | null> {
  const result: Record<string, number | null> = {}
  for (const ind of indicators) {
    if (ind.value === null || ind.value === undefined) {
      result[ind.code] = null
      continue
    }
    const scorer = SCORERS[ind.code]
    result[ind.code] = scorer ? scorer(ind.value) : null
  }
  return result
}

// ---------------------------------------------------------------------------
// Dimension composition
// ---------------------------------------------------------------------------

interface ComponentDef { code: string; weight: number }
interface DimensionDef  { name: string; weight: number; components: ComponentDef[] }

const DIMENSIONS: DimensionDef[] = [
  {
    name: 'Economic Momentum',
    weight: 0.25,
    components: [
      { code: 'NGDP_RPCH', weight: 0.70 },
      { code: 'NID_NGDP',  weight: 0.30 },
    ],
  },
  {
    name: 'Price Stability',
    weight: 0.20,
    components: [
      { code: 'PCPIPCH', weight: 1.00 },
    ],
  },
  {
    name: 'Fiscal Position',
    weight: 0.20,
    components: [
      { code: 'GGXWDG_NGDP', weight: 0.60 },
      { code: 'GGXCNL_NGDP', weight: 0.40 },
    ],
  },
  {
    name: 'External Balance',
    weight: 0.20,
    components: [
      { code: 'BCA_NGDPD', weight: 0.70 },
      { code: 'TX_RPCH',   weight: 0.30 },
    ],
  },
  {
    name: 'Labor Market',
    weight: 0.15,
    components: [
      { code: 'LUR', weight: 1.00 },
    ],
  },
]

function computeDimensionScore(
  def: DimensionDef,
  scores: Record<string, number | null>,
): number | null {
  let weightedSum = 0
  let totalWeight = 0

  for (const comp of def.components) {
    const s = scores[comp.code]
    if (s !== null && s !== undefined) {
      weightedSum += s * comp.weight
      totalWeight += comp.weight
    }
  }

  if (totalWeight === 0) return null
  return weightedSum / totalWeight
}

function classifySentiment(composite: number): Sentiment {
  if (composite >= 75) return 'strong'
  if (composite >= 55) return 'moderate'
  if (composite >= 35) return 'weak'
  return 'vulnerable'
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function computeHealthScore(
  indicators: WorldBankIndicator[],
): EconomicHealthScore {
  const scores = scoreIndicators(indicators)

  let weightedCompositeSum = 0
  let totalCompositeWeight = 0

  const dimensions: DimensionScore[] = DIMENSIONS.map((def) => {
    const dimScore = computeDimensionScore(def, scores)

    if (dimScore !== null) {
      weightedCompositeSum += dimScore * def.weight
      totalCompositeWeight += def.weight
    }

    return {
      name: def.name,
      score: dimScore ?? 0,
      weight: def.weight,
    }
  })

  const composite =
    totalCompositeWeight === 0
      ? 0
      : Math.round((weightedCompositeSum / totalCompositeWeight) * 10)

  return {
    composite,
    sentiment: classifySentiment(composite),
    dimensions,
  }
}
