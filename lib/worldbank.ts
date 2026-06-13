import type { WorldBankIndicator } from '@/types'

export const INDICATORS: Record<string, { name: string; unit: string }> = {
  'NY.GDP.MKTP.KD.ZG': { name: 'GDP growth (annual %)', unit: '%' },
  'FP.CPI.TOTL.ZG':    { name: 'Inflation (CPI, annual %)', unit: '%' },
  'NY.GDP.MKTP.CD':    { name: 'GDP (current US$)', unit: 'USD' },
  'SL.UEM.TOTL.ZS':   { name: 'Unemployment rate (%)', unit: '%' },
}

export const COUNTRIES: Array<{ code: string; name: string }> = [
  { code: 'ID', name: 'Indonesia' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'TH', name: 'Thailand' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'PH', name: 'Philippines' },
  { code: 'SG', name: 'Singapore' },
  { code: 'IN', name: 'India' },
  { code: 'CN', name: 'China' },
  { code: 'BR', name: 'Brazil' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'KE', name: 'Kenya' },
  { code: 'TR', name: 'Turkey' },
  { code: 'MX', name: 'Mexico' },
  { code: 'AR', name: 'Argentina' },
  { code: 'EG', name: 'Egypt' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
  { code: 'JP', name: 'Japan' },
  { code: 'US', name: 'United States' },
]

const DEFAULT_INDICATOR_CODES = Object.keys(INDICATORS)
const cache = new Map<string, { data: WorldBankIndicator[]; ts: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000
// Expose for testing — allows test suites to clear between cases
export function clearCache(): void {
  cache.clear()
}

interface WBDataPoint {
  indicator: { id: string; value: string }
  country: { id: string; value: string }
  date: string
  value: number | null
}

async function fetchSingleIndicator(
  countryCode: string,
  indicatorCode: string
): Promise<WorldBankIndicator> {
  const meta = INDICATORS[indicatorCode] ?? { name: indicatorCode, unit: '' }
  const url = `https://api.worldbank.org/v2/country/${countryCode}/indicator/${indicatorCode}?format=json&mrv=5`

  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`WB API ${res.status}`)
    const [, dataPoints] = (await res.json()) as [unknown, WBDataPoint[]]
    const latest = dataPoints?.find((d) => d.value !== null)
    return {
      code: indicatorCode,
      name: meta.name,
      value: latest?.value ?? null,
      year: latest ? Number(latest.date) : null,
      unit: meta.unit,
    }
  } catch {
    return { code: indicatorCode, name: meta.name, value: null, year: null, unit: meta.unit }
  }
}

export async function fetchIndicators(
  countryCode: string,
  indicatorCodes: string[] = DEFAULT_INDICATOR_CODES
): Promise<WorldBankIndicator[]> {
  const cacheKey = `${countryCode}:${indicatorCodes.join(',')}`
  // Skip cache in test environment so unit tests can control fetch per-call
  if (process.env.NODE_ENV !== 'test') {
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data
  }

  const data = await Promise.all(
    indicatorCodes.map((code) => fetchSingleIndicator(countryCode, code))
  )
  cache.set(cacheKey, { data, ts: Date.now() })
  return data
}

export function formatIndicatorValue(code: string, value: number | null): string {
  if (value === null) return 'N/A'
  if (code === 'NY.GDP.MKTP.CD') {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)} trillion`
    if (value >= 1e9)  return `$${(value / 1e9).toFixed(1)} billion`
    return `$${value.toLocaleString()}`
  }
  return `${value.toFixed(1)}%`
}
