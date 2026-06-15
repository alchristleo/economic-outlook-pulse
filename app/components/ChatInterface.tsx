'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { SendHorizonal, Bot, User } from 'lucide-react'
import ComparisonCard from '@/app/components/ComparisonCard'
import type { Briefing, Message, WorldBankIndicator, ComparisonData } from '@/types'

interface ChatInterfaceProps {
  briefing: Briefing
  worldBankData: WorldBankIndicator[]
  disabled?: boolean
}

const COMPARISON_MARKER = /\[COMPARISON_DATA\]([\s\S]*?)\[\/COMPARISON_DATA\]/

function parseMessageContent(raw: string): {
  text: string
  comparisonData: ComparisonData | null
} {
  const match = raw.match(COMPARISON_MARKER)
  if (!match) return { text: raw, comparisonData: null }
  try {
    return {
      text: raw.replace(match[0], '').trim(),
      comparisonData: JSON.parse(match[1]) as ComparisonData,
    }
  } catch {
    return { text: raw.replace(match[0], '').trim(), comparisonData: null }
  }
}

const SUGGESTED_QUESTIONS = [
  'What are the main risks right now?',
  "How does this compare to neighbours?",
  "What's the outlook for next year?",
]

export default function ChatInterface({
  briefing,
  worldBankData,
  disabled,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || isStreaming) return

    const userMessage: Message = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setIsStreaming(true)

    const assistantPlaceholder: Message = { role: 'assistant', content: '' }
    setMessages([...newMessages, assistantPlaceholder])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, briefing, worldBankData }),
      })

      if (!res.body) throw new Error('No response body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: accumulated },
        ])
      }

      // Parse and strip COMPARISON_DATA marker from final accumulated text
      const { text, comparisonData } = parseMessageContent(accumulated)
      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          role: 'assistant' as const,
          content: text,
          comparisonData: comparisonData ?? undefined,
        },
      ])
    } catch {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: 'An error occurred. Please try again.' },
      ])
    } finally {
      setIsStreaming(false)
    }
  }

  return (
    <div className="flex h-full min-h-[500px] flex-col rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-[#E3120B]" />
          <h2 className="text-sm font-semibold text-[#1A1A1A]">The Correspondent</h2>
        </div>
        <p className="text-xs text-gray-500">Ask about {briefing.country_name}&apos;s economy</p>
      </div>

      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
            <Bot className="h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-400">Ask me anything about this briefing</p>
            <div className="mt-1 flex flex-col gap-2 w-full">
              {(briefing.suggested_questions?.length
                ? briefing.suggested_questions
                : SUGGESTED_QUESTIONS
              ).map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="rounded border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:border-[#E3120B] hover:text-[#E3120B] transition-colors text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`mb-4 flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${
                msg.role === 'user' ? 'bg-[#1A1A1A]' : 'bg-[#E3120B]'
              }`}
            >
              {msg.role === 'user' ? (
                <User className="h-3.5 w-3.5 text-white" />
              ) : (
                <Bot className="h-3.5 w-3.5 text-white" />
              )}
            </div>
            <div className="max-w-[85%] flex flex-col gap-2">
              {msg.comparisonData && (
                <ComparisonCard
                  data={msg.comparisonData}
                  baseCountryName={briefing.country_name}
                  baseIndicators={briefing.key_indicators}
                />
              )}
              <div
                className={`rounded-lg px-3 py-2 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#1A1A1A] text-white'
                    : 'bg-gray-50 text-gray-800'
                }`}
              >
                {msg.content ||
                  (isStreaming && i === messages.length - 1 ? (
                    <span className="animate-pulse text-gray-400">&#9612;</span>
                  ) : null)}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </ScrollArea>

      <form
        onSubmit={handleSubmit}
        className="flex gap-2 border-t border-gray-100 p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about the economy..."
          disabled={disabled || isStreaming}
          className="flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#E3120B] disabled:opacity-50 transition-colors"
        />
        <Button
          type="submit"
          size="sm"
          disabled={disabled || isStreaming || !input.trim()}
          className="bg-[#E3120B] text-white hover:bg-[#E3120B]/90"
        >
          <SendHorizonal className="h-4 w-4" />
        </Button>
      </form>
    </div>
  )
}
