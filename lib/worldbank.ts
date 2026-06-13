// Country/currency metadata, exchange rate fetching, and indicator formatting.
// Data fetching has moved to lib/imf.ts.

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
  // NGDPD is reported in USD billions by IMF
  if (code === 'NGDPD') {
    if (value >= 1000) return `$${(value / 1000).toFixed(2)} trillion`
    return `$${value.toFixed(1)} billion`
  }
  if (code === 'NGDPDPC') {
    return `$${Math.round(value).toLocaleString()}`
  }
  return `${value.toFixed(1)}%`
}
