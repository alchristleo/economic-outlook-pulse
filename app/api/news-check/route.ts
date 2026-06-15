import { NextRequest } from 'next/server'
import { anthropic, MODEL, parseJsonResponse } from '@/lib/anthropic'
import { COUNTRIES } from '@/lib/worldbank'
import { createNewsCheckSystemPrompt, createNewsCheckUserPrompt } from '@/lib/prompts'
import type { Briefing, NewsArticle, NewsCheckResult } from '@/types'

export const maxDuration = 30

async function fetchGdelt(query: string, attempt = 0): Promise<NewsArticle[]> {
  const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=artlist&maxrecords=10&format=json&timespan=30d`
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) })

  if (res.status === 429 && attempt === 0) {
    await new Promise((r) => setTimeout(r, 6000))
    return fetchGdelt(query, 1)
  }

  if (!res.ok) return []

  const data = (await res.json()) as { articles?: Array<{ title: string; url: string }> }
  return (data.articles ?? [])
    .filter((a) => a.title && a.url)
    .slice(0, 10)
    .map((a) => ({ title: a.title, url: a.url }))
}

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

    let articles: NewsArticle[] = []
    try {
      articles = await fetchGdelt(country.name)
    } catch {
      // timeout or network error
    }

    if (articles.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No recent news available for this country via GDELT' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const headlines = articles.map((a) => a.title)

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 600,
      system: createNewsCheckSystemPrompt(),
      messages: [{ role: 'user', content: createNewsCheckUserPrompt(briefing, headlines) }],
    })

    const raw = message.content.find((b) => b.type === 'text')?.text ?? ''
    const result = parseJsonResponse(raw) as NewsCheckResult

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
