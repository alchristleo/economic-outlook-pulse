import { NextRequest, NextResponse } from 'next/server'
import { anthropic, MODEL_DRAFT, MODEL_FAST } from '@/lib/anthropic'
import { fetchIndicators } from '@/lib/imf'
import { fetchExchangeRate, COUNTRIES } from '@/lib/worldbank'
import {
  createBriefingSystemPrompt,
  createBriefingUserPrompt,
  createCriticPrompt,
  createRevisionPrompt,
} from '@/lib/prompts'
import { computeHealthScore } from '@/lib/scoring'
import type { GenerateBriefRequest, Briefing, ConfidenceLevel } from '@/types'

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

    const systemPromptText = createBriefingSystemPrompt()

    // Pass 1: Draft — extended thinking + prompt cache on static system prompt
    const draftMessage = await anthropic.messages.create({
      model: MODEL_DRAFT,
      max_tokens: 10000,
      thinking: { type: 'enabled', budget_tokens: 8000 },
      system: [
        {
          type: 'text' as const,
          text: systemPromptText,
          cache_control: { type: 'ephemeral' as const },
        },
      ],
      messages: [
        {
          role: 'user',
          content: createBriefingUserPrompt(countryName, countryCode, indicators, healthScore),
        },
      ],
    })

    const draftText = draftMessage.content
      .filter((block) => block.type === 'text')
      .map((block) => (block.type === 'text' ? block.text : ''))
      .join('')

    // Pass 2: Critic — identify 3 weaknesses in the draft
    const criticMessage = await anthropic.messages.create({
      model: MODEL_FAST,
      max_tokens: 500,
      messages: [{ role: 'user', content: createCriticPrompt(draftText) }],
    })

    const criticText =
      criticMessage.content[0]?.type === 'text' ? criticMessage.content[0].text : '[]'
    let critique: string[] = []
    try {
      const parsed = JSON.parse(criticText)
      if (Array.isArray(parsed)) critique = parsed.map(String)
    } catch {
      // critique stays [] — revision performs a general quality pass
    }

    // Pass 3: Revision — incorporate critique, produce final JSON
    const finalMessage = await anthropic.messages.create({
      model: MODEL_FAST,
      max_tokens: 1500,
      system: systemPromptText,
      messages: [
        { role: 'user', content: createRevisionPrompt(draftText, critique) },
      ],
    })

    const rawText =
      finalMessage.content[0]?.type === 'text' ? finalMessage.content[0].text : ''

    let parsedData: Record<string, unknown>
    try {
      parsedData = JSON.parse(rawText)
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
      confidence: (['high', 'medium', 'low'] as ConfidenceLevel[]).includes(
        parsedData.confidence as ConfidenceLevel
      )
        ? (parsedData.confidence as ConfidenceLevel)
        : 'medium',
      data_quality_note:
        typeof parsedData.data_quality_note === 'string' && parsedData.data_quality_note.length > 0
          ? parsedData.data_quality_note
          : undefined,
    }

    return NextResponse.json({ briefing, indicators })
  } catch (err) {
    console.error('[generate-brief]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
