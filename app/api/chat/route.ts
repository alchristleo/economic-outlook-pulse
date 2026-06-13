import { NextRequest } from 'next/server'
import { anthropic, MODEL, streamToReadableStream } from '@/lib/anthropic'
import { createChatSystemPrompt } from '@/lib/prompts'
import type { ChatRequest } from '@/types'

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

    const recentMessages = messages.slice(-8)

    const stream = anthropic.messages.stream({
      model: MODEL,
      max_tokens: 800,
      system: createChatSystemPrompt(briefing, worldBankData),
      messages: recentMessages.map((m) => ({ role: m.role, content: m.content })),
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
