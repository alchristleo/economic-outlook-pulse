import { NextRequest, NextResponse } from 'next/server'
import { anthropic, MODEL } from '@/lib/anthropic'
import { fetchIndicators, COUNTRIES } from '@/lib/worldbank'
import { createBriefingSystemPrompt, createBriefingUserPrompt } from '@/lib/prompts'
import type { GenerateBriefRequest, Briefing } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GenerateBriefRequest
    const { countryCode } = body

    // Validate against allowlist — derive name server-side, never trust client
    const country = COUNTRIES.find((c) => c.code === countryCode)
    if (!country) {
      return NextResponse.json(
        { error: 'Invalid country code' },
        { status: 400 }
      )
    }

    const countryName = country.name

    const indicators = await fetchIndicators(countryCode)

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: createBriefingSystemPrompt(),
      messages: [
        {
          role: 'user',
          content: createBriefingUserPrompt(countryName, countryCode, indicators),
        },
      ],
    })

    const rawText = message.content[0].type === 'text' ? message.content[0].text : ''

    let parsedData: Record<string, unknown>
    try {
      parsedData = JSON.parse(rawText)
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse JSON from model', raw: rawText },
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
    }

    return NextResponse.json({ briefing, indicators })
  } catch (err) {
    console.error('[generate-brief]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
