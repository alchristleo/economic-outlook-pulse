import { NextRequest, NextResponse } from 'next/server'
import { anthropic, MODEL } from '@/lib/anthropic'
import { COUNTRIES } from '@/lib/worldbank'
import { fetchIndicators } from '@/lib/imf'
import { createScenarioSystemPrompt, createScenarioUserPrompt } from '@/lib/prompts'
import type { ScenarioRequest, ScenarioResult } from '@/types'

export const maxDuration = 30

const MAX_HYPOTHESIS_LENGTH = 500

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ScenarioRequest
    const { countryCode, hypothesis, briefing } = body

    if (!countryCode || !hypothesis?.trim() || !briefing) {
      return NextResponse.json(
        { error: 'countryCode, hypothesis, and briefing are required' },
        { status: 400 }
      )
    }

    if (!COUNTRIES.find((c) => c.code === countryCode)) {
      return NextResponse.json({ error: 'Invalid country code' }, { status: 400 })
    }

    const sanitizedHypothesis = String(hypothesis).trim().slice(0, MAX_HYPOTHESIS_LENGTH)

    const indicators = await fetchIndicators(countryCode)

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1000,
      system: createScenarioSystemPrompt(),
      messages: [
        {
          role: 'user',
          content: createScenarioUserPrompt(briefing, indicators, sanitizedHypothesis),
        },
      ],
    })

    const rawText = message.content[0]?.type === 'text' ? message.content[0].text : ''
    if (!rawText) {
      return NextResponse.json({ error: 'Model returned no content' }, { status: 500 })
    }

    let scenario: ScenarioResult
    try {
      scenario = JSON.parse(rawText) as ScenarioResult
    } catch {
      return NextResponse.json({ error: 'Failed to parse scenario JSON' }, { status: 500 })
    }

    return NextResponse.json({ scenario })
  } catch (err) {
    console.error('[scenario]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
