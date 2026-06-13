import type { WorldBankIndicator } from '@/types'

export const INDICATORS: Record<string, { name: string; unit: string }> = {
  // Economic Momentum
  'NY.GDP.MKTP.KD.ZG': { name: 'GDP growth (annual %)', unit: '%' },
  'NE.TRD.GNFS.ZS':    { name: 'Trade (% of GDP)', unit: '%' },
  // Monetary Health
  'FP.CPI.TOTL.ZG':    { name: 'Inflation (CPI, annual %)', unit: '%' },
  'FI.RES.TOTL.MO':    { name: 'FX Reserves (months of imports)', unit: 'months' },
  // Fiscal Position
  'GC.DOD.TOTL.GD.ZS': { name: 'Government debt (% of GDP)', unit: '%' },
  // External Balance
  'BN.CAB.XOKA.GD.ZS': { name: 'Current account balance (% of GDP)', unit: '%' },
  'BX.KLT.DINV.WD.GD.ZS': { name: 'FDI net inflows (% of GDP)', unit: '%' },
  // Institutional Quality (WGI, –2.5 to 2.5)
  'PV.EST':             { name: 'Political stability (WGI)', unit: 'index' },
  'RL.EST':             { name: 'Rule of law (WGI)', unit: 'index' },
  'CC.EST':             { name: 'Control of corruption (WGI)', unit: 'index' },
  // Display-only (not dimension-scored)
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

export const COUNTRY_CURRENCY: Record<string, string> = {
  ID: 'IDR', MY: 'MYR', TH: 'THB', VN: 'VND', PH: 'PHP', SG: 'SGD',
  IN: 'INR', CN: 'CNY', BR: 'BRL', ZA: 'ZAR', NG: 'NGN', KE: 'KES',
  TR: 'TRY', MX: 'MXN', AR: 'ARS', EG: 'EGP', PK: 'PKR', BD: 'BDT',
  GB: 'GBP', DE: 'EUR', JP: 'JPY', US: 'USD',
}

// Scored dimensions — subset of INDICATORS used by scoring.ts
export const DIMENSION_INDICATOR_CODES = [
  'NY.GDP.MKTP.KD.ZG',
  'NE.TRD.GNFS.ZS',
  'FP.CPI.TOTL.ZG',
  'FI.RES.TOTL.MO',
  'GC.DOD.TOTL.GD.ZS',
  'BN.CAB.XOKA.GD.ZS',
  'BX.KLT.DINV.WD.GD.ZS',
  'PV.EST',
  'RL.EST',
  'CC.EST',
]

export const DEFAULT_INDICATOR_CODES = Object.keys(INDICATORS)

const cache = new Map<string, { data: WorldBankIndicator[]; ts: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000

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
  if (process.env.NODE_ENV !== 'test') {
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data
  }

  const data = await Promise.all(
    indicatorCodes.map((code) => fetchSingleIndicator(countryCode, code))
  )

  if (process.env.NODE_ENV !== 'test') {
    cache.set(cacheKey, { data, ts: Date.now() })
  }

  return data
}

export async function fetchExchangeRate(
  countryCode: string
): Promise<{ currency: string; rate: number } | null> {
  const currency = COUNTRY_CURRENCY[countryCode]
  if (!currency || currency === 'USD') return null

  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD')
    if (!res.ok) throw new Error(`Exchange rate API ${res.status}`)
    const json = (await res.json()) as { result: string; rates: Record<string, number> }
    const rate = json.rates[currency]
    if (rate == null) return null
    return { currency, rate }
  } catch {
    return null
  }
}

export function formatIndicatorValue(code: string, value: number | null): string {
  if (value === null) return 'N/A'
  if (code === 'NY.GDP.MKTP.CD') {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)} trillion`
    if (value >= 1e9)  return `$${(value / 1e9).toFixed(1)} billion`
    return `$${value.toLocaleString()}`
  }
  if (code === 'FI.RES.TOTL.MO') return `${value.toFixed(1)} mo`
  if (['PV.EST', 'RL.EST', 'CC.EST'].includes(code)) return value.toFixed(2)
  return `${value.toFixed(1)}%`
}
