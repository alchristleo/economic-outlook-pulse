# Tool Use in Chat + Multi-Country Comparison — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the chat API with a `fetch_country_indicators` tool so Claude can fetch live IMF data for up to 3 comparison countries mid-conversation, then render a styled `ComparisonCard` inline in the chat bubble.

**Architecture:** Non-streaming agentic tool loop in `/api/chat` — Claude calls `fetch_country_indicators(country_code)`, server validates + executes `fetchIndicators()`, feeds results back, loops until `stop_reason !== 'tool_use'`, then returns final text as a single response. Client parses a `[COMPARISON_DATA]{...}[/COMPARISON_DATA]` marker from the response and renders `ComparisonCard` inline above the text bubble.

**Tech Stack:** Next.js 14 App Router, TypeScript strict, `@anthropic-ai/sdk` (`Anthropic.Tool`, `Anthropic.ToolUseBlock`, `Anthropic.MessageParam`), existing `fetchIndicators` from `lib/imf.ts`, existing `COUNTRIES` from `lib/worldbank.ts`, Tailwind CSS, shadcn/ui `Card`.

**No tests — MVP only.**

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `types/index.ts` | Modify | Add `ComparisonCountry`, `ComparisonData`; extend `Message` with `comparisonData?` |
| `lib/prompts.ts` | Modify | Add tool instructions + marker format to `createChatSystemPrompt` |
| `app/api/chat/route.ts` | Rewrite | Agentic tool loop, `executeToolCall`, return final text |
| `app/components/ComparisonCard.tsx` | Create | Styled comparison table, direction-aware color pills |
| `app/components/ChatInterface.tsx` | Modify | Parse marker after response, render `ComparisonCard` inline |

---

### Task 1: Types

**Files:**
- Modify: `types/index.ts`

- [ ] **Step 1: Add `ComparisonCountry`, `ComparisonData`, extend `Message`**

Open `types/index.ts`. After the existing `Message` interface, add:

```ts
export interface ComparisonCountry {
  code: string
  name: string
  indicators: WorldBankIndicator[]
}

export interface ComparisonData {
  base_country_code: string
  countries: ComparisonCountry[]  // 1–3 comparison countries
}
```

Extend the existing `Message` interface to add the optional field:

```ts
export interface Message {
  role: 'user' | 'assistant'
  content: string
  comparisonData?: ComparisonData
}
```

- [ ] **Step 2: Verify TypeScript still passes**

```bash
npx tsc --noEmit 2>&1 | grep -v node_modules
```

Expected: same output as before (only the pre-existing regex flag warning in `__tests__/lib/prompts.test.ts`).

- [ ] **Step 3: Commit**

```bash
git add types/index.ts
git commit -m "feat(types): add ComparisonCountry, ComparisonData; extend Message with comparisonData"
```

---

### Task 2: Update chat system prompt

**Files:**
- Modify: `lib/prompts.ts`

The `createChatSystemPrompt` function currently ends with a `## Your role` section. Add a `## Tools available` section before it.

- [ ] **Step 1: Add tool instructions to `createChatSystemPrompt`**

In `lib/prompts.ts`, locate the `createChatSystemPrompt` function. Find this section in the return string:

```
## Your role
```

Insert the following block **immediately before** `## Your role`:

```ts
## Tools available
You have access to the \`fetch_country_indicators\` tool. Use it when the user asks to compare ${briefing.country_name} with another country, or requests economic data on a different country.

Rules:
- Call the tool once per comparison country (maximum 3 calls per response)
- After receiving results, embed ALL comparison data in your response using EXACTLY this format on its own line before your narrative text:

[COMPARISON_DATA]{"base_country_code":"${briefing.country_code}","countries":[REPLACE_WITH_TOOL_RESULTS]}[/COMPARISON_DATA]

Where REPLACE_WITH_TOOL_RESULTS is an array of objects using the exact JSON from each tool result:
{"code":"VN","name":"Vietnam","indicators":[...exact indicators array from tool result...]}

- Only include [COMPARISON_DATA] if you actually called the tool. Never include it for regular questions.
- Do not invent or modify indicator values — use exactly what the tool returned.

```

The full updated function return string now has the sections in order:
1. Your identity paragraph
2. Security rules
3. ## Economic Health Index
4. ## Dimension Scores
5. ## Current Briefing
6. **## Tools available** ← new
7. ## Your role

- [ ] **Step 2: Verify TypeScript passes**

```bash
npx tsc --noEmit 2>&1 | grep -v node_modules
```

Expected: same pre-existing warning only.

- [ ] **Step 3: Commit**

```bash
git add lib/prompts.ts
git commit -m "feat(prompts): add tool use instructions and COMPARISON_DATA marker format to chat system prompt"
```

---

### Task 3: Rewrite chat route with agentic tool loop

**Files:**
- Rewrite: `app/api/chat/route.ts`

This is the core change. Replace the current streaming route with a non-streaming agentic tool loop.

Current route uses `anthropic.messages.stream()` and returns a `ReadableStream`. New route uses `anthropic.messages.create()` in a loop, returns final text as a plain `Response`.

- [ ] **Step 1: Rewrite `app/api/chat/route.ts`**

Replace the entire file with:

```ts
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
```

- [ ] **Step 2: Verify TypeScript passes**

```bash
npx tsc --noEmit 2>&1 | grep -v node_modules
```

Expected: same pre-existing warning only.

- [ ] **Step 3: Quick smoke test — normal message (no tool use)**

```bash
# First generate a brief so you have something to test against
# Then test a regular chat message:
curl -s -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "What is the bottom line for this economy?"}],
    "briefing": {
      "title": "Test", "executive_summary": "Test summary",
      "key_indicators": [], "risks": [], "opportunities": [],
      "what_to_watch": [], "bottom_line": "Test is growing.",
      "generated_at": "2026-01-01T00:00:00Z",
      "country_code": "ID", "country_name": "Indonesia",
      "data_year": 2024,
      "health_score": {"composite": 70, "sentiment": "moderate", "dimensions": []},
      "exchange_rate": null,
      "confidence": "medium"
    },
    "worldBankData": []
  }'
```

Expected: plain text response, no `[COMPARISON_DATA]` marker, no error.

- [ ] **Step 4: Commit**

```bash
git add app/api/chat/route.ts
git commit -m "feat(chat): replace streaming with agentic tool loop for country comparison"
```

---

### Task 4: ComparisonCard component

**Files:**
- Create: `app/components/ComparisonCard.tsx`

- [ ] **Step 1: Create `app/components/ComparisonCard.tsx`**

```tsx
'use client'

import { Card } from '@/components/ui/card'
import type { ComparisonData, WorldBankIndicator } from '@/types'

interface Props {
  data: ComparisonData
  baseCountryName: string
  baseIndicators: WorldBankIndicator[]
}

const COMPARISON_ROWS = [
  { code: 'NGDP_RPCH',   label: 'GDP growth',      unit: '%',     higherIsBetter: true },
  { code: 'PCPIPCH',     label: 'Inflation',        unit: '%',     higherIsBetter: false },
  { code: 'GGXCNL_NGDP', label: 'Fiscal balance',  unit: '% GDP', higherIsBetter: true },
  { code: 'BCA_NGDPD',   label: 'Current account', unit: '% GDP', higherIsBetter: true },
  { code: 'LUR',         label: 'Unemployment',     unit: '%',     higherIsBetter: false },
  { code: 'GGXWDG_NGDP', label: 'Govt debt',       unit: '% GDP', higherIsBetter: false },
]

function getValue(indicators: WorldBankIndicator[], code: string): number | null {
  return indicators.find((i) => i.code === code)?.value ?? null
}

function fmt(val: number | null): string {
  if (val === null) return '—'
  return val.toFixed(1)
}

interface PillProps {
  base: number | null
  compare: number | null
  higherIsBetter: boolean
}

function DiffPill({ base, compare, higherIsBetter }: PillProps) {
  if (base === null || compare === null) {
    return <span className="text-xs text-gray-400">—</span>
  }
  const diff = compare - base
  if (Math.abs(diff) < 0.05) {
    return (
      <span className="inline-block rounded-full bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-500">
        ≈0
      </span>
    )
  }
  const isBetter = higherIsBetter ? diff > 0 : diff < 0
  const sign = diff > 0 ? '+' : ''
  return (
    <span
      className={`inline-block rounded-full px-1.5 py-0.5 text-xs font-medium ${
        isBetter ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
      }`}
    >
      {sign}{diff.toFixed(1)}pp
    </span>
  )
}

export default function ComparisonCard({ data, baseCountryName, baseIndicators }: Props) {
  const latestYear = baseIndicators.find((i) => i.year !== null)?.year

  return (
    <Card className="overflow-hidden border border-gray-200 shadow-none">
      <div className="border-b border-gray-100 bg-gray-50 px-4 py-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Country Comparison
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="w-36 px-4 py-2 text-left text-xs font-medium text-gray-500">
                Indicator
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">
                {baseCountryName}
                <span className="ml-1 text-[10px] font-normal text-gray-400">(base)</span>
              </th>
              {data.countries.map((c) => (
                <th
                  key={c.code}
                  className="px-4 py-2 text-right text-xs font-medium text-gray-700"
                >
                  {c.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPARISON_ROWS.map((row, i) => {
              const baseVal = getValue(baseIndicators, row.code)
              return (
                <tr
                  key={row.code}
                  className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}
                >
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-gray-600">
                    {row.label}
                    <span className="ml-1 text-gray-400">({row.unit})</span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-xs font-medium text-gray-800">
                    {fmt(baseVal)}
                  </td>
                  {data.countries.map((c) => {
                    const cVal = getValue(c.indicators, row.code)
                    return (
                      <td key={c.code} className="px-4 py-2.5 text-right">
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-xs font-medium text-gray-800">
                            {fmt(cVal)}
                          </span>
                          <DiffPill
                            base={baseVal}
                            compare={cVal}
                            higherIsBetter={row.higherIsBetter}
                          />
                        </div>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="border-t border-gray-100 px-4 py-2">
        <p className="text-right text-xs text-gray-400">
          IMF WEO data{latestYear ? ` · ${latestYear}` : ''} · green pill = better vs {baseCountryName}
        </p>
      </div>
    </Card>
  )
}
```

- [ ] **Step 2: Verify TypeScript passes**

```bash
npx tsc --noEmit 2>&1 | grep -v node_modules
```

Expected: same pre-existing warning only.

- [ ] **Step 3: Commit**

```bash
git add app/components/ComparisonCard.tsx
git commit -m "feat(component): add ComparisonCard with direction-aware color pills"
```

---

### Task 5: Update ChatInterface — parse marker, render ComparisonCard

**Files:**
- Modify: `app/components/ChatInterface.tsx`

The current `ChatInterface` accumulates streamed text and updates messages on every chunk. We need to:
1. After the response read loop completes, parse `[COMPARISON_DATA]` marker out of the accumulated text
2. Strip the marker from displayed content
3. Store `comparisonData` on the message
4. Render `ComparisonCard` above the text bubble when `msg.comparisonData` is set

- [ ] **Step 1: Add imports**

At the top of `app/components/ChatInterface.tsx`, add to the existing imports:

```ts
import ComparisonCard from '@/components/ComparisonCard'
import type { Briefing, Message, WorldBankIndicator, ComparisonData } from '@/types'
```

(Replace the existing `type { Briefing, Message, WorldBankIndicator }` import with this.)

- [ ] **Step 2: Add `parseMessageContent` helper**

Add this function above the `export default function ChatInterface` line:

```ts
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
```

- [ ] **Step 3: Update `handleSubmit` — parse marker after read loop**

In `handleSubmit`, after the `while (true)` read loop closes (after the closing `}`), add:

```ts
// Parse comparison marker from final accumulated text
const { text, comparisonData } = parseMessageContent(accumulated)
setMessages((prev) => [
  ...prev.slice(0, -1),
  {
    role: 'assistant' as const,
    content: text,
    comparisonData: comparisonData ?? undefined,
  },
])
```

Remove the `setMessages` call that was inside the loop (the one that sets `{ role: 'assistant', content: accumulated }`), OR keep it for the streaming effect and let the final setMessages after the loop overwrite it. Keeping the in-loop update is fine — it shows raw text briefly, then the parsed version replaces it instantly.

The full updated try block inside `handleSubmit`:

```ts
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

  // Parse and strip COMPARISON_DATA marker from final text
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
```

- [ ] **Step 4: Update message rendering — render ComparisonCard above text bubble**

Find the message rendering block. Currently each message renders:

```tsx
<div className={`max-w-[85%] rounded-lg px-3 py-2 ...`}>
  {msg.content || ...}
</div>
```

Replace the inner `div` (the message bubble wrapper and content) with:

```tsx
<div className="max-w-[85%] flex flex-col gap-2">
  {msg.comparisonData && (
    <ComparisonCard
      data={msg.comparisonData}
      baseCountryName={briefing.country_name}
      baseIndicators={briefing.key_indicators}
    />
  )}
  {msg.content && (
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
  )}
</div>
```

Note: The outer `flex gap-2` wrapper already existed for the avatar + bubble. The `max-w-[85%]` moves from the bubble `div` to this new wrapper `div`.

- [ ] **Step 5: Verify TypeScript passes**

```bash
npx tsc --noEmit 2>&1 | grep -v node_modules
```

Expected: same pre-existing warning only.

- [ ] **Step 6: Commit**

```bash
git add app/components/ChatInterface.tsx
git commit -m "feat(chat): parse COMPARISON_DATA marker and render ComparisonCard inline"
```

---

## Integration Test

After all 5 tasks are complete, verify end-to-end in the browser:

1. Start the dev server: `npm run dev`
2. Select Indonesia, generate a brief
3. In the chat, type: `Compare Indonesia to Vietnam and Malaysia`
4. Expected:
   - Response takes ~5–8 seconds (tool loop + 2 indicator fetches)
   - `ComparisonCard` appears inline in the chat bubble
   - Table shows 6 indicators × 3 countries
   - Vietnam and Malaysia columns have green/red diff pills vs Indonesia base
   - Below the card: Claude's narrative comparison text
5. Type: `Also compare to Thailand` (third comparison country)
6. Expected: new `ComparisonCard` with Thailand column appears
7. Type: `What is the bottom line for Indonesia?` (non-comparison question)
8. Expected: plain text response, no `ComparisonCard`
