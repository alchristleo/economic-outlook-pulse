import { NextRequest, NextResponse } from 'next/server'
import { anthropic, MODEL } from '@/lib/anthropic'
import { COUNTRIES } from '@/lib/worldbank'
import { fetchIndicators } from '@/lib/imf'
import { createDebateSystemPrompt, createDebateUserPrompt } from '@/lib/prompts'
import type { Briefing, DebateResult } from '@/types'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { countryCode: string; briefing: Briefing }
    const { countryCode, briefing } = body

    if (!countryCode || !briefing) {
      return NextResponse.json({ error: 'countryCode and briefing are required' }, { status: 400 })
    }

    if (!COUNTRIES.find((c) => c.code === countryCode)) {
      return NextResponse.json({ error: 'Invalid country code' }, { status: 400 })
    }

    const indicators = await fetchIndicators(countryCode)

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 800,
      system: createDebateSystemPrompt(),
      messages: [
        { role: 'user', content: createDebateUserPrompt(briefing, indicators) },
      ],
    })

    const rawText = message.content[0]?.type === 'text' ? message.content[0].text : ''
    if (!rawText) {
      return NextResponse.json({ error: 'Model returned no content' }, { status: 500 })
    }

    let debate: DebateResult
    try {
      debate = JSON.parse(rawText) as DebateResult
    } catch {
      return NextResponse.json({ error: 'Failed to parse debate JSON' }, { status: 500 })
    }

    return NextResponse.json({ debate })
  } catch (err) {
    console.error('[debate]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
