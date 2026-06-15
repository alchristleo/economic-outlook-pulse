import { NextRequest, NextResponse } from 'next/server'
import { anthropic, MODEL, parseJsonResponse } from '@/lib/anthropic'
import { fetchIndicators } from '@/lib/imf'
import { fetchExchangeRate, COUNTRIES } from '@/lib/worldbank'
import { createBriefingSystemPrompt, createBriefingUserPrompt } from '@/lib/prompts'
import { computeHealthScore } from '@/lib/scoring'
import type { GenerateBriefRequest, Briefing } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GenerateBriefRequest
    const { countryCode } = body

    const country = COUNTRIES.find((c) => c.code === countryCode)
    if (!country) {
      return NextResponse.json({ error: 'Invalid country code' }, { status: 400 })
    }

    const countryName = country.name

    // Fetch all indicators and exchange rate in parallel
    const [indicators, exchangeRate] = await Promise.all([
      fetchIndicators(countryCode),
      fetchExchangeRate(countryCode),
    ])

    // Compute health score before calling Claude
    const healthScore = computeHealthScore(indicators)

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: createBriefingSystemPrompt(),
      messages: [
        {
          role: 'user',
          content: createBriefingUserPrompt(countryName, countryCode, indicators, healthScore),
        },
      ],
    })

    const rawText = message.content[0].type === 'text' ? message.content[0].text : ''

    let parsedData: Record<string, unknown>
    try {
      parsedData = parseJsonResponse(rawText) as Record<string, unknown>
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse JSON from model' },
        { status: 500 }
      )
    }

    const latestYear = indicators.find((i) => i.year !== null)?.year ?? null

    const briefing: Briefing = {
      title: String(parsedData.title ?? ''),
      executive_summary: String(parsedData.executive_summary ?? ''),
      key_indicators: indicators,
      risks: Array.isArray(parsedData.risks) ? (parsedData.risks as string[]) : [],
      opportunities: Array.isArray(parsedData.opportunities) ? (parsedData.opportunities as string[]) : [],
      what_to_watch: Array.isArray(parsedData.what_to_watch) ? (parsedData.what_to_watch as string[]) : [],
      bottom_line: String(parsedData.bottom_line ?? ''),
      generated_at: new Date().toISOString(),
      country_code: countryCode,
      country_name: countryName,
      data_year: latestYear,
      health_score: healthScore,
      exchange_rate: exchangeRate,
    }

    return NextResponse.json({ briefing, indicators })
  } catch (err) {
    console.error('[generate-brief]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
