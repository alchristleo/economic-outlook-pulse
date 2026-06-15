import { NextRequest, NextResponse } from 'next/server'
import { COUNTRIES, COUNTRY_CURRENCY } from '@/lib/worldbank'
import { fetchHistoricalRates, computeCurrencyForecast } from '@/lib/forex'
import type { CurrencyForecastData } from '@/types'

const MIN_MONTHS = 12

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { countryCode?: unknown }
    const countryCode = String(body.countryCode ?? '')

    const country = COUNTRIES.find((c) => c.code === countryCode)
    if (!country) {
      return NextResponse.json({ error: 'Invalid country code' }, { status: 400 })
    }

    const currencyCode = COUNTRY_CURRENCY[countryCode]
    if (!currencyCode || currencyCode === 'USD') {
      return NextResponse.json(
        { error: 'No foreign currency forecast for USD-denominated countries' },
        { status: 422 }
      )
    }

    let historical
    try {
      historical = await fetchHistoricalRates(currencyCode, 36)
    } catch {
      return NextResponse.json(
        { error: `Exchange rate data unavailable for ${currencyCode}` },
        { status: 422 }
      )
    }

    if (historical.length < MIN_MONTHS) {
      return NextResponse.json(
        { error: `Insufficient history for ${currencyCode} (need ≥${MIN_MONTHS} months)` },
        { status: 422 }
      )
    }

    const forecast: CurrencyForecastData = computeCurrencyForecast(
      currencyCode,
      historical,
      12
    )

    return NextResponse.json({ forecast })
  } catch (err) {
    console.error('[currency-forecast]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
