import { fetchIndicators, INDICATORS } from '@/lib/imf'

global.fetch = jest.fn()
const mockFetch = global.fetch as jest.Mock

function makeIMFResponse(
  code: string,
  iso3: string,
  data: Record<string, number | null>
) {
  return {
    values: { [code]: { [iso3]: data } },
  }
}

describe('fetchIndicators', () => {
  beforeEach(() => mockFetch.mockClear())

  it('returns most recent year with valid value', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () =>
        makeIMFResponse('NGDP_RPCH', 'IDN', {
          '2022': 5.31,
          '2023': 5.05,
          '2024': 5.0,
          '2025': 4.9,
        }),
    })

    const result = await fetchIndicators('ID', ['NGDP_RPCH'])
    expect(result).toHaveLength(1)
    expect(result[0].value).toBe(4.9)
    expect(result[0].year).toBe(2025)
    expect(result[0].code).toBe('NGDP_RPCH')
  })

  it('skips null years and returns next valid value', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () =>
        makeIMFResponse('NGDP_RPCH', 'IDN', {
          '2023': 5.05,
          '2024': null,
          '2025': null,
        }),
    })

    const result = await fetchIndicators('ID', ['NGDP_RPCH'])
    expect(result[0].value).toBe(5.05)
    expect(result[0].year).toBe(2023)
  })

  it('returns null value when all years are null', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => makeIMFResponse('NGDP_RPCH', 'IDN', { '2024': null }),
    })

    const result = await fetchIndicators('ID', ['NGDP_RPCH'])
    expect(result[0].value).toBeNull()
    expect(result[0].year).toBeNull()
  })

  it('returns null value when fetch fails', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))
    const result = await fetchIndicators('ID', ['NGDP_RPCH'])
    expect(result[0].value).toBeNull()
  })

  it('returns null for unknown country code', async () => {
    const result = await fetchIndicators('XX', ['NGDP_RPCH'])
    expect(result[0].value).toBeNull()
  })

  it('returns null when country data is missing from response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ values: { NGDP_RPCH: {} } }),
    })
    const result = await fetchIndicators('ID', ['NGDP_RPCH'])
    expect(result[0].value).toBeNull()
  })
})

describe('INDICATORS', () => {
  it('includes all dimension indicator codes', () => {
    const dimensionCodes = [
      'NGDP_RPCH', 'NID_NGDP', 'PCPIPCH',
      'GGXWDG_NGDP', 'GGXCNL_NGDP',
      'BCA_NGDPD', 'TX_RPCH', 'LUR',
    ]
    for (const code of dimensionCodes) {
      expect(INDICATORS).toHaveProperty(code)
    }
  })
})
