import { formatIndicatorValue, fetchExchangeRate, COUNTRY_CURRENCY } from '@/lib/worldbank'

global.fetch = jest.fn()
const mockFetch = global.fetch as jest.Mock

describe('formatIndicatorValue', () => {
  it('formats NGDPD in trillions when >= 1000 billion', () => {
    expect(formatIndicatorValue('NGDPD', 1200)).toBe('$1.20 trillion')
  })

  it('formats NGDPD in billions when < 1000', () => {
    expect(formatIndicatorValue('NGDPD', 400.5)).toBe('$400.5 billion')
  })

  it('formats NGDPDPC as USD integer with commas', () => {
    expect(formatIndicatorValue('NGDPDPC', 4700)).toBe('$4,700')
  })

  it('formats percentage indicators with one decimal', () => {
    expect(formatIndicatorValue('NGDP_RPCH', 5.31)).toBe('5.3%')
  })

  it('formats percentage for any unknown code', () => {
    expect(formatIndicatorValue('SOME_CODE', 3.7)).toBe('3.7%')
  })

  it('returns N/A for null value', () => {
    expect(formatIndicatorValue('NGDP_RPCH', null)).toBe('N/A')
  })
})

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
