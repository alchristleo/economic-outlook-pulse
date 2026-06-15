import { NextRequest } from 'next/server'
import { anthropic, MODEL, parseJsonResponse } from '@/lib/anthropic'
import { COUNTRIES } from '@/lib/worldbank'
import { fetchIndicators } from '@/lib/imf'
import { createLensSystemPrompt, createLensUserPrompt } from '@/lib/prompts'
import type { Briefing, LensResult, LensType } from '@/types'

export const maxDuration = 30

const VALID_LENSES: LensType[] = ['bond', 'equity', 'central_bank']

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { countryCode: string; lens: LensType; briefing: Briefing }
    const { countryCode, lens, briefing } = body

    const country = COUNTRIES.find((c) => c.code === countryCode)
    if (!country) {
      return new Response(JSON.stringify({ error: 'Invalid country code' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!VALID_LENSES.includes(lens)) {
      return new Response(JSON.stringify({ error: 'Invalid lens' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const indicators = await fetchIndicators(countryCode)

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 600,
      system: createLensSystemPrompt(lens),
      messages: [{ role: 'user', content: createLensUserPrompt(briefing, indicators, lens) }],
    })

    const raw = message.content.find((b) => b.type === 'text')?.text ?? ''
    const result = parseJsonResponse(raw) as LensResult

    return new Response(JSON.stringify({ result }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[lens]', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
