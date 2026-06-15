import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { anthropic, MODEL } from '@/lib/anthropic'
import { COUNTRIES } from '@/lib/worldbank'
import { fetchIndicators } from '@/lib/imf'
import { createChatSystemPrompt } from '@/lib/prompts'
import type { ChatRequest } from '@/types'

export const maxDuration = 60

const MAX_MESSAGE_LENGTH = 2000
const MAX_MESSAGES = 8
const MAX_TOOL_ITERATIONS = 5

const CHAT_TOOLS: Anthropic.Tool[] = [
  {
    name: 'fetch_country_indicators',
    description:
      'Fetch real IMF economic indicators for a country. Use when the user asks to compare with another country or requests economic data on a different country. Call once per country. Maximum 3 calls per response.',
    input_schema: {
      type: 'object' as const,
      properties: {
        country_code: {
          type: 'string',
          description: "ISO alpha-2 country code, e.g. 'VN' for Vietnam, 'MY' for Malaysia, 'US' for United States",
        },
      },
      required: ['country_code'],
    },
  },
]

async function executeToolCall(
  name: string,
  input: Record<string, unknown>
): Promise<string> {
  if (name !== 'fetch_country_indicators') {
    return JSON.stringify({ error: 'Unknown tool' })
  }
  const code = String(input.country_code ?? '').toUpperCase()
  const country = COUNTRIES.find((c) => c.code === code)
  if (!country) {
    return JSON.stringify({ error: `Unknown country code: ${code}. Use ISO alpha-2 codes like VN, MY, TH.` })
  }
  const indicators = await fetchIndicators(code)
  return JSON.stringify({ country_code: code, country_name: country.name, indicators })
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChatRequest
    const { messages, briefing, worldBankData } = body

    if (!messages?.length || !briefing) {
      return NextResponse.json(
        { error: 'messages and briefing are required' },
        { status: 400 }
      )
    }

    if (!COUNTRIES.find((c) => c.code === briefing.country_code)) {
      return NextResponse.json(
        { error: 'Invalid country in briefing' },
        { status: 400 }
      )
    }

    const sanitizedMessages: Anthropic.MessageParam[] = messages
      .slice(-MAX_MESSAGES)
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: String(m.content).slice(0, MAX_MESSAGE_LENGTH),
      }))

    const systemPrompt = createChatSystemPrompt(briefing, worldBankData)

    let currentMessages: Anthropic.MessageParam[] = sanitizedMessages
    let response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1500,
      tools: CHAT_TOOLS,
      tool_choice: { type: 'auto' },
      system: systemPrompt,
      messages: currentMessages,
    })

    let iterations = 0
    while (response.stop_reason === 'tool_use' && iterations < MAX_TOOL_ITERATIONS) {
      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
      )

      const toolResults = await Promise.all(
        toolUseBlocks.map(async (block) => ({
          type: 'tool_result' as const,
          tool_use_id: block.id,
          content: await executeToolCall(
            block.name,
            block.input as Record<string, unknown>
          ),
        }))
      )

      currentMessages = [
        ...currentMessages,
        { role: 'assistant' as const, content: response.content },
        { role: 'user' as const, content: toolResults },
      ]

      response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 1500,
        tools: CHAT_TOOLS,
        tool_choice: { type: 'auto' },
        system: systemPrompt,
        messages: currentMessages,
      })
      iterations++
    }

    const finalText = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')

    return new Response(finalText, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  } catch (err) {
    console.error('[chat]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
