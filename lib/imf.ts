import type { WorldBankIndicator } from '@/types'

const IMF_BASE = 'https://www.imf.org/external/datamapper/api/v1'

const ISO2_TO_ISO3: Record<string, string> = {
  ID: 'IDN', MY: 'MYS', TH: 'THA', VN: 'VNM', PH: 'PHL', SG: 'SGP',
  IN: 'IND', CN: 'CHN', BR: 'BRA', ZA: 'ZAF', NG: 'NGA', KE: 'KEN',
  TR: 'TUR', MX: 'MEX', AR: 'ARG', EG: 'EGY', PK: 'PAK', BD: 'BGD',
  GB: 'GBR', DE: 'DEU', JP: 'JPN', US: 'USA',
}

export const INDICATORS: Record<string, { name: string; unit: string }> = {
  // Economic Momentum
  'NGDP_RPCH':   { name: 'Real GDP growth (%)', unit: '%' },
  'NID_NGDP':    { name: 'Total investment (% of GDP)', unit: '%' },
  // Price Stability
  'PCPIPCH':     { name: 'Inflation, CPI (%)', unit: '%' },
  // Fiscal Position
  'GGXWDG_NGDP': { name: 'Gross govt debt (% of GDP)', unit: '%' },
  'GGXCNL_NGDP': { name: 'Fiscal balance (% of GDP)', unit: '%' },
  // External Balance
  'BCA_NGDPD':   { name: 'Current account balance (% of GDP)', unit: '%' },
  'TX_RPCH':     { name: 'Export volume growth (%)', unit: '%' },
  // Labor Market
  'LUR':         { name: 'Unemployment rate (%)', unit: '%' },
  // Display-only
  'NGDPD':       { name: 'GDP (current USD billions)', unit: 'USD bn' },
  'NGDPDPC':     { name: 'GDP per capita (current USD)', unit: 'USD' },
}

export const DIMENSION_INDICATOR_CODES = [
  'NGDP_RPCH', 'NID_NGDP',
  'PCPIPCH',
  'GGXWDG_NGDP', 'GGXCNL_NGDP',
  'BCA_NGDPD', 'TX_RPCH',
  'LUR',
]

export const DEFAULT_INDICATOR_CODES = Object.keys(INDICATORS)

interface IMFResponse {
  values?: {
    [code: string]: {
      [iso3: string]: {
        [year: string]: number | null
      }
    }
  }
}

const cache = new Map<string, { data: WorldBankIndicator[]; ts: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000

async function fetchIMFIndicator(iso3: string, code: string): Promise<WorldBankIndicator> {
  const meta = INDICATORS[code] ?? { name: code, unit: '' }
  const url = `${IMF_BASE}/${code}/${iso3}`

  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`IMF API ${res.status}`)
    const json = (await res.json()) as IMFResponse
    const countryData = json.values?.[code]?.[iso3]

    if (!countryData) {
      return { code, name: meta.name, value: null, year: null, unit: meta.unit }
    }

    // Cap at current year + 1 to avoid pulling far-future WEO projections (IMF projects 5 years ahead)
    const maxYear = new Date().getFullYear() + 1
    const years = Object.keys(countryData)
      .map(Number)
      .filter((y) => y <= maxYear)
      .sort((a, b) => b - a)
    for (const year of years) {
      const val = countryData[year]
      if (val !== null && val !== undefined) {
        return { code, name: meta.name, value: val, year, unit: meta.unit }
      }
    }

    return { code, name: meta.name, value: null, year: null, unit: meta.unit }
  } catch {
    return { code, name: meta.name, value: null, year: null, unit: meta.unit }
  }
}

export async function fetchIndicators(
  countryCode: string,
  indicatorCodes: string[] = DEFAULT_INDICATOR_CODES
): Promise<WorldBankIndicator[]> {
  const iso3 = ISO2_TO_ISO3[countryCode]
  if (!iso3) {
    return indicatorCodes.map((code) => {
      const meta = INDICATORS[code] ?? { name: code, unit: '' }
      return { code, name: meta.name, value: null, year: null, unit: meta.unit }
    })
  }

  const cacheKey = `${iso3}:${indicatorCodes.join(',')}`
  if (process.env.NODE_ENV !== 'test') {
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data
  }

  const data = await Promise.all(
    indicatorCodes.map((code) => fetchIMFIndicator(iso3, code))
  )

  if (process.env.NODE_ENV !== 'test') {
    cache.set(cacheKey, { data, ts: Date.now() })
  }

  return data
}
