import type { MonthlyRate, CurrencyForecastData } from '@/types'

const FRANKFURTER_BASE = 'https://api.frankfurter.app'

interface FrankfurterResponse {
  base: string
  rates: Record<string, Record<string, number>>
}

export function sampleMonthlyRates(
  rates: Record<string, Record<string, number>>,
  currencyCode: string
): MonthlyRate[] {
  const byMonth: Record<string, number> = {}
  for (const [dateStr, dayRates] of Object.entries(rates)) {
    const monthKey = dateStr.slice(0, 7)
    if (!(monthKey in byMonth) && dayRates[currencyCode] != null) {
      byMonth[monthKey] = dayRates[currencyCode]
    }
  }
  return Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, rate]) => ({ month, rate }))
}

export async function fetchHistoricalRates(
  currencyCode: string,
  monthsBack = 36
): Promise<MonthlyRate[]> {
  const end = new Date()
  const start = new Date(end)
  start.setMonth(start.getMonth() - monthsBack)

  const startStr = start.toISOString().slice(0, 10)
  const endStr = end.toISOString().slice(0, 10)

  const res = await fetch(
    `${FRANKFURTER_BASE}/${startStr}..${endStr}?from=USD&to=${currencyCode}`
  )
  if (!res.ok) throw new Error(`Frankfurter API ${res.status} for ${currencyCode}`)
  const json = (await res.json()) as FrankfurterResponse
  return sampleMonthlyRates(json.rates ?? {}, currencyCode)
}

export interface RegressionResult {
  slope: number
  intercept: number
  rSquared: number
  residualStd: number
  xMean: number
  xSumSqDev: number
  n: number
}

export function linearRegression(points: { x: number; y: number }[]): RegressionResult {
  const n = points.length
  const sumX = points.reduce((acc, p) => acc + p.x, 0)
  const sumY = points.reduce((acc, p) => acc + p.y, 0)
  const sumXY = points.reduce((acc, p) => acc + p.x * p.y, 0)
  const sumX2 = points.reduce((acc, p) => acc + p.x * p.x, 0)

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n
  const xMean = sumX / n

  const yMean = sumY / n
  const ssTot = points.reduce((acc, p) => acc + (p.y - yMean) ** 2, 0)
  const ssRes = points.reduce((acc, p) => acc + (p.y - (slope * p.x + intercept)) ** 2, 0)
  const rSquared = ssTot === 0 ? 1 : Math.max(0, 1 - ssRes / ssTot)
  const residualStd = n > 2 ? Math.sqrt(ssRes / (n - 2)) : 0
  const xSumSqDev = points.reduce((acc, p) => acc + (p.x - xMean) ** 2, 0)

  return { slope, intercept, rSquared, residualStd, xMean, xSumSqDev, n }
}

export function forecastPoints(
  reg: RegressionResult,
  startX: number,
  steps: number,
  zScore = 1.96
): Array<{ value: number; upper: number; lower: number }> {
  return Array.from({ length: steps }, (_, h) => {
    const x = startX + h
    const value = reg.slope * x + reg.intercept
    const se =
      reg.residualStd *
      Math.sqrt(1 + 1 / reg.n + (x - reg.xMean) ** 2 / (reg.xSumSqDev || 1))
    const margin = zScore * se
    return { value, upper: value + margin, lower: value - margin }
  })
}

function addMonths(isoMonth: string, count: number): string {
  const [y, m] = isoMonth.split('-').map(Number)
  const d = new Date(y, m - 1 + count, 1)
  const yr = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  return `${yr}-${mo}`
}

export function computeCurrencyForecast(
  currencyCode: string,
  historical: MonthlyRate[],
  forecastMonths = 12
): CurrencyForecastData {
  const points = historical.map((r, i) => ({ x: i, y: r.rate }))
  const reg = linearRegression(points)

  const lastIndex = historical.length - 1
  const lastMonth = historical[lastIndex].month
  const projections = forecastPoints(reg, lastIndex + 1, forecastMonths)

  const forecast: MonthlyRate[] = projections.map((p, i) => ({
    month: addMonths(lastMonth, i + 1),
    rate: Math.max(0, Math.round(p.value * 100) / 100),
  }))

  return {
    currencyCode,
    historical,
    forecast,
    forecastCI: {
      upper: projections.map(p => Math.max(0, Math.round(p.upper * 100) / 100)),
      lower: projections.map(p => Math.max(0, Math.round(p.lower * 100) / 100)),
    },
    regressionSlope: Math.round(reg.slope * 100) / 100,
    rSquared: Math.round(reg.rSquared * 1000) / 1000,
  }
}
