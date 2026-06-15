import { NextRequest } from 'next/server'
import { anthropic, MODEL } from '@/lib/anthropic'
import { COUNTRIES } from '@/lib/worldbank'
import { createNewsCheckSystemPrompt, createNewsCheckUserPrompt } from '@/lib/prompts'
import type { Briefing, NewsArticle, NewsCheckResult } from '@/types'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { countryCode: string; briefing: Briefing }
    const { countryCode, briefing } = body

    const country = COUNTRIES.find((c) => c.code === countryCode)
    if (!country) {
      return new Response(JSON.stringify({ error: 'Invalid country code' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Fetch GDELT headlines — titles only, no full content
    const gdeltUrl = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(country.name)}&mode=artlist&maxrecords=10&format=json&timespan=7d`
    let articles: NewsArticle[] = []

    try {
      const gdeltRes = await fetch(gdeltUrl, { signal: AbortSignal.timeout(8000) })
      if (gdeltRes.ok) {
        const gdeltData = (await gdeltRes.json()) as {
          articles?: Array<{ title: string; url: string }>
        }
        articles = (gdeltData.articles ?? [])
          .filter((a) => a.title && a.url)
          .slice(0, 10)
          .map((a) => ({ title: a.title, url: a.url }))
      }
    } catch {
      // GDELT timeout or error — fall through to 400
    }

    if (articles.length === 0) {
      return new Response(JSON.stringify({ error: 'No recent news available' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const headlines = articles.map((a) => a.title)

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 600,
      system: createNewsCheckSystemPrompt(),
      messages: [{ role: 'user', content: createNewsCheckUserPrompt(briefing, headlines) }],
    })

    const raw = message.content.find((b) => b.type === 'text')?.text ?? ''
    const result = JSON.parse(raw) as NewsCheckResult

    return new Response(JSON.stringify({ result, articles }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[news-check]', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
