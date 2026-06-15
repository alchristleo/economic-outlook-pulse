import Anthropic from '@anthropic-ai/sdk'

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY is not set in environment')
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export const MODEL = 'claude-sonnet-4-6'
export const MODEL_DRAFT = 'claude-opus-4-8'
export const MODEL_FAST = 'claude-sonnet-4-6'

export function parseJsonResponse(raw: string): unknown {
  const text = raw.trim()
  // 1. Try direct parse
  try { return JSON.parse(text) } catch { /* continue */ }
  // 2. Strip markdown fences
  const stripped = text.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim()
  try { return JSON.parse(stripped) } catch { /* continue */ }
  // 3. Extract first JSON object or array from anywhere in the string
  const match = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
  if (match) return JSON.parse(match[1])
  throw new Error(`Cannot parse JSON from model response: ${text.slice(0, 120)}`)
}

export function streamToReadableStream(
  stream: ReturnType<typeof anthropic.messages.stream>
): ReadableStream<Uint8Array> {
  return new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (
          chunk.type === 'content_block_delta' &&
          chunk.delta.type === 'text_delta'
        ) {
          controller.enqueue(new TextEncoder().encode(chunk.delta.text))
        }
      }
      controller.close()
    },
  })
}
