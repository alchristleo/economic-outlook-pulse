import { NextRequest } from 'next/server'
import { anthropic, MODEL, streamToReadableStream } from '@/lib/anthropic'
import { COUNTRIES } from '@/lib/worldbank'
import { createChatSystemPrompt } from '@/lib/prompts'
import type { ChatRequest } from '@/types'

const MAX_MESSAGE_LENGTH = 2000
const MAX_MESSAGES = 8

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChatRequest
    const { messages, briefing, worldBankData } = body

    if (!messages?.length || !briefing) {
      return new Response(
        JSON.stringify({ error: 'messages and briefing are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Validate briefing country is in allowlist
    if (!COUNTRIES.find((c) => c.code === briefing.country_code)) {
      return new Response(
        JSON.stringify({ error: 'Invalid country in briefing' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Sanitize messages: allowlist role, cap length, strip to plain strings
    const recentMessages = messages
      .slice(-MAX_MESSAGES)
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: String(m.content).slice(0, MAX_MESSAGE_LENGTH),
      }))

    const stream = anthropic.messages.stream({
      model: MODEL,
      max_tokens: 800,
      system: createChatSystemPrompt(briefing, worldBankData),
      messages: recentMessages,
    })

    return new Response(streamToReadableStream(stream), {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    })
  } catch (err) {
    console.error('[chat]', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
