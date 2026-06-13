import { fetchIndicators, formatIndicatorValue, INDICATORS } from '@/lib/worldbank'

global.fetch = jest.fn()
const mockFetch = global.fetch as jest.Mock

function makeMockResponse(indicatorId: string, value: number | null, year: number) {
  return [
    { page: 1, pages: 1, per_page: 5, total: 1 },
    [
      {
        indicator: { id: indicatorId, value: 'Test Indicator' },
        country: { id: 'ID', value: 'Indonesia' },
        date: String(year),
        value,
      },
    ],
  ]
}

describe('fetchIndicators', () => {
  beforeEach(() => mockFetch.mockClear())

  it('returns parsed indicator with value and year', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => makeMockResponse('NY.GDP.MKTP.KD.ZG', 5.31, 2023),
    })

    const result = await fetchIndicators('ID', ['NY.GDP.MKTP.KD.ZG'])
    expect(result).toHaveLength(1)
    expect(result[0].value).toBe(5.31)
    expect(result[0].year).toBe(2023)
    expect(result[0].code).toBe('NY.GDP.MKTP.KD.ZG')
  })

  it('returns null value when data point is null', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => makeMockResponse('NY.GDP.MKTP.KD.ZG', null, 2023),
    })

    const result = await fetchIndicators('ID', ['NY.GDP.MKTP.KD.ZG'])
    expect(result[0].value).toBeNull()
  })

  it('returns null value when fetch fails', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))
    const result = await fetchIndicators('ID', ['NY.GDP.MKTP.KD.ZG'])
    expect(result).toHaveLength(1)
    expect(result[0].value).toBeNull()
  })
})

describe('formatIndicatorValue', () => {
  it('formats GDP in trillions', () => {
    expect(formatIndicatorValue('NY.GDP.MKTP.CD', 1.2e12)).toBe('$1.20 trillion')
  })

  it('formats GDP in billions', () => {
    expect(formatIndicatorValue('NY.GDP.MKTP.CD', 1.4e9)).toBe('$1.4 billion')
  })

  it('formats percentage with one decimal', () => {
    expect(formatIndicatorValue('NY.GDP.MKTP.KD.ZG', 5.31)).toBe('5.3%')
  })

  it('returns N/A for null value', () => {
    expect(formatIndicatorValue('NY.GDP.MKTP.KD.ZG', null)).toBe('N/A')
  })
})

import { fetchExchangeRate, COUNTRY_CURRENCY } from '@/lib/worldbank'

describe('COUNTRY_CURRENCY', () => {
  it('maps ID to IDR', () => {
    expect(COUNTRY_CURRENCY['ID']).toBe('IDR')
  })

  it('maps GB to GBP', () => {
    expect(COUNTRY_CURRENCY['GB']).toBe('GBP')
  })
})

describe('fetchExchangeRate', () => {
  beforeEach(() => mockFetch.mockClear())

  it('returns rate for known currency', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ result: 'success', rates: { IDR: 15800 } }),
    })
    const result = await fetchExchangeRate('ID')
    expect(result).toEqual({ currency: 'IDR', rate: 15800 })
  })

  it('returns null for unknown country', async () => {
    const result = await fetchExchangeRate('XX')
    expect(result).toBeNull()
  })

  it('returns null on fetch failure', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))
    const result = await fetchExchangeRate('ID')
    expect(result).toBeNull()
  })
})
