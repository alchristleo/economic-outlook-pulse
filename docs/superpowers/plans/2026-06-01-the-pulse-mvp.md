# The Pulse — MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a demo-ready AI briefing app in The Economist's voice, grounded in World Bank data, with streaming conversational analysis.

**Architecture:** Next.js 14 App Router with server-side API routes for LLM calls (keeps API keys server-side). World Bank data fetched on-demand and injected into prompts. Streaming responses via Anthropic SDK's native stream, piped to a ReadableStream response.

**Tech Stack:** Next.js 14, TypeScript strict, Tailwind CSS, shadcn/ui, Recharts, @anthropic-ai/sdk, sonner, lucide-react, date-fns

---

## File Map

### Created
- `types/index.ts` — All shared interfaces (Briefing, Message, WorldBankIndicator, Country, etc.)
- `lib/worldbank.ts` — World Bank API client + in-memory cache + COUNTRIES list
- `lib/prompts.ts` — System prompts + Economist voice instructions
- `lib/anthropic.ts` — Reusable Anthropic client singleton + streamToResponse helper
- `app/api/generate-brief/route.ts` — POST: fetch WB data → generate briefing JSON via Claude
- `app/api/chat/route.ts` — POST: streaming chat with full briefing context
- `app/components/CountrySelector.tsx` — shadcn Select wrapper for country picking
- `app/components/IndicatorChart.tsx` — KPI grid with trend icons per indicator
- `app/components/BriefingCard.tsx` — Full briefing display (header, indicators, risks, bottom line)
- `app/components/ChatInterface.tsx` — Streaming chat UI with history, suggested questions
- `app/(main)/page.tsx` — Main page: selector → generate → briefing + chat layout
- `app/(main)/layout.tsx` — Root layout with Toaster + metadata
- `app/(main)/globals.css` — Tailwind base + Economist typography tokens
- `__tests__/types.test.ts` — Type-level smoke tests
- `__tests__/lib/worldbank.test.ts` — Unit tests for WB fetch, cache, formatter
- `__tests__/lib/prompts.test.ts` — Tests for prompt generation functions
- `__tests__/components/CountrySelector.test.tsx`
- `__tests__/components/IndicatorChart.test.tsx`
- `__tests__/components/BriefingCard.test.tsx`
- `__tests__/components/ChatInterface.test.tsx`
- `jest.config.ts` — Jest + Next.js configuration
- `jest.setup.ts` — @testing-library/jest-dom setup

### Modified
- `package.json` — Add all dependencies
- `tailwind.config.ts` — Economist color tokens
- `.env.local` — ANTHROPIC_API_KEY (not committed)

---

## Task 1: Project Scaffold + Test Setup

**Files:**
- Modify: `package.json`
- Create: `jest.config.ts`
- Create: `jest.setup.ts`
- Modify: `tailwind.config.ts`
- Create: `.env.local`

- [ ] **Step 1: Install production dependencies**

```bash
npm install @anthropic-ai/sdk lucide-react date-fns recharts sonner
```

- [ ] **Step 2: Install shadcn/ui**

```bash
npx shadcn@latest init --defaults
npx shadcn@latest add card button select dialog tabs badge separator scroll-area
```

- [ ] **Step 3: Install test dependencies**

```bash
npm install -D jest @types/jest ts-jest @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom
```

- [ ] **Step 4: Create jest.config.ts**

```ts
import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterFramework: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
}

export default createJestConfig(config)
```

- [ ] **Step 5: Create jest.setup.ts**

```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 6: Add Economist color tokens to tailwind.config.ts**

Replace the `theme.extend` section:
```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        economist: {
          red: '#E3120B',
          dark: '#121212',
          ink: '#1A1A1A',
          paper: '#F8F4EC',
          rule: '#CC0001',
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
```

- [ ] **Step 7: Create .env.local**

```bash
echo "ANTHROPIC_API_KEY=sk-ant-your-key-here" > .env.local
```
Then replace the placeholder with your actual key.

- [ ] **Step 8: Verify jest runs**

```bash
npx jest --passWithNoTests
```
Expected: exits 0 with `No tests found` or similar

- [ ] **Step 9: Commit**

```bash
git add package.json jest.config.ts jest.setup.ts tailwind.config.ts .gitignore
git commit -m "chore: scaffold project with testing setup and Economist theme tokens"
```

---

## Task 2: Types

**Files:**
- Create: `types/index.ts`
- Create: `__tests__/types.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/types.test.ts`:
```ts
import type { Briefing, Message, WorldBankIndicator, ChatRequest, GenerateBriefRequest, Country } from '@/types'

const indicator: WorldBankIndicator = {
  code: 'NY.GDP.MKTP.KD.ZG',
  name: 'GDP growth (annual %)',
  value: 5.3,
  year: 2023,
  unit: '%',
}

const message: Message = {
  role: 'user',
  content: 'What about inflation?',
}

const briefing: Briefing = {
  title: 'Indonesia: Steady Growth',
  executive_summary: 'Southeast Asia...',
  key_indicators: [indicator],
  risks: ['Commodity price volatility'],
  opportunities: ['Digital economy expansion'],
  what_to_watch: ['Bank Indonesia rate decisions'],
  bottom_line: 'Cautiously optimistic.',
  generated_at: new Date().toISOString(),
  country_code: 'ID',
  country_name: 'Indonesia',
  data_year: 2023,
}

const country: Country = { code: 'ID', name: 'Indonesia' }

test('types compile and hold expected values', () => {
  expect(indicator.code).toBe('NY.GDP.MKTP.KD.ZG')
  expect(briefing.title).toBeDefined()
  expect(message.role).toBe('user')
  expect(country.code).toBe('ID')
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx jest __tests__/types.test.ts
```
Expected: FAIL — `Cannot find module '@/types'`

- [ ] **Step 3: Create types/index.ts**

```ts
export interface WorldBankIndicator {
  code: string
  name: string
  value: number | null
  year: number | null
  unit: string
}

export interface Briefing {
  title: string
  executive_summary: string
  key_indicators: WorldBankIndicator[]
  risks: string[]
  opportunities: string[]
  what_to_watch: string[]
  bottom_line: string
  generated_at: string
  country_code: string
  country_name: string
  data_year: number | null
}

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatRequest {
  messages: Message[]
  briefing: Briefing
  worldBankData: WorldBankIndicator[]
}

export interface GenerateBriefRequest {
  countryCode: string
  countryName: string
}

export interface Country {
  code: string
  name: string
  region?: string
}
```

- [ ] **Step 4: Run tests to verify pass**

```bash
npx jest __tests__/types.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add types/index.ts __tests__/types.test.ts
git commit -m "feat: add core TypeScript interfaces for Briefing, Message, WorldBankIndicator"
```

---

## Task 3: World Bank Data Layer

**Files:**
- Create: `lib/worldbank.ts`
- Create: `__tests__/lib/worldbank.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/lib/worldbank.test.ts`:
```ts
import { fetchIndicators, formatIndicatorValue, INDICATORS } from '@/lib/worldbank'

global.fetch = jest.fn()
const mockFetch = global.fetch as jest.Mock

function makeMockResponse(indicatorId: string, value: number | null, year: number) {
  return [
    { page: 1, pages: 1, per_page: 5, total: 1 },
    [
      {
        indicator: { id: indicatorId, value: 'Test Indicator' },
        country: { id: 'ID', value: 'Indonesia' },
        date: String(year),
        value,
      },
    ],
  ]
}

describe('fetchIndicators', () => {
  beforeEach(() => mockFetch.mockClear())

  it('returns parsed indicator with value and year', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => makeMockResponse('NY.GDP.MKTP.KD.ZG', 5.31, 2023),
    })

    const result = await fetchIndicators('ID', ['NY.GDP.MKTP.KD.ZG'])
    expect(result).toHaveLength(1)
    expect(result[0].value).toBe(5.31)
    expect(result[0].year).toBe(2023)
    expect(result[0].code).toBe('NY.GDP.MKTP.KD.ZG')
  })

  it('returns null value when data point is null', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => makeMockResponse('NY.GDP.MKTP.KD.ZG', null, 2023),
    })

    const result = await fetchIndicators('ID', ['NY.GDP.MKTP.KD.ZG'])
    expect(result[0].value).toBeNull()
  })

  it('returns null value when fetch fails', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))
    const result = await fetchIndicators('ID', ['NY.GDP.MKTP.KD.ZG'])
    expect(result).toHaveLength(1)
    expect(result[0].value).toBeNull()
  })
})

describe('formatIndicatorValue', () => {
  it('formats GDP in trillions', () => {
    expect(formatIndicatorValue('NY.GDP.MKTP.CD', 1.2e12)).toBe('$1.20 trillion')
  })

  it('formats GDP in billions', () => {
    expect(formatIndicatorValue('NY.GDP.MKTP.CD', 1.4e9)).toBe('$1.4 billion')
  })

  it('formats percentage with one decimal', () => {
    expect(formatIndicatorValue('NY.GDP.MKTP.KD.ZG', 5.31)).toBe('5.3%')
  })

  it('returns N/A for null value', () => {
    expect(formatIndicatorValue('NY.GDP.MKTP.KD.ZG', null)).toBe('N/A')
  })
})
```

- [ ] **Step 2: Run to see it fail**

```bash
npx jest __tests__/lib/worldbank.test.ts
```
Expected: FAIL — `Cannot find module '@/lib/worldbank'`

- [ ] **Step 3: Create lib/worldbank.ts**

```ts
import type { WorldBankIndicator } from '@/types'

export const INDICATORS: Record<string, { name: string; unit: string }> = {
  'NY.GDP.MKTP.KD.ZG': { name: 'GDP growth (annual %)', unit: '%' },
  'FP.CPI.TOTL.ZG':    { name: 'Inflation (CPI, annual %)', unit: '%' },
  'NY.GDP.MKTP.CD':    { name: 'GDP (current US$)', unit: 'USD' },
  'SL.UEM.TOTL.ZS':   { name: 'Unemployment rate (%)', unit: '%' },
}

export const COUNTRIES: Array<{ code: string; name: string }> = [
  { code: 'ID', name: 'Indonesia' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'TH', name: 'Thailand' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'PH', name: 'Philippines' },
  { code: 'SG', name: 'Singapore' },
  { code: 'IN', name: 'India' },
  { code: 'CN', name: 'China' },
  { code: 'BR', name: 'Brazil' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'KE', name: 'Kenya' },
  { code: 'TR', name: 'Turkey' },
  { code: 'MX', name: 'Mexico' },
  { code: 'AR', name: 'Argentina' },
  { code: 'EG', name: 'Egypt' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
  { code: 'JP', name: 'Japan' },
  { code: 'US', name: 'United States' },
]

const DEFAULT_INDICATOR_CODES = Object.keys(INDICATORS)
const cache = new Map<string, { data: WorldBankIndicator[]; ts: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000

interface WBDataPoint {
  indicator: { id: string; value: string }
  country: { id: string; value: string }
  date: string
  value: number | null
}

async function fetchSingleIndicator(
  countryCode: string,
  indicatorCode: string
): Promise<WorldBankIndicator> {
  const meta = INDICATORS[indicatorCode] ?? { name: indicatorCode, unit: '' }
  const url = `https://api.worldbank.org/v2/country/${countryCode}/indicator/${indicatorCode}?format=json&mrv=5`

  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`WB API ${res.status}`)
    const [, dataPoints] = (await res.json()) as [unknown, WBDataPoint[]]
    const latest = dataPoints?.find((d) => d.value !== null)
    return {
      code: indicatorCode,
      name: meta.name,
      value: latest?.value ?? null,
      year: latest ? Number(latest.date) : null,
      unit: meta.unit,
    }
  } catch {
    return { code: indicatorCode, name: meta.name, value: null, year: null, unit: meta.unit }
  }
}

export async function fetchIndicators(
  countryCode: string,
  indicatorCodes: string[] = DEFAULT_INDICATOR_CODES
): Promise<WorldBankIndicator[]> {
  const cacheKey = `${countryCode}:${indicatorCodes.join(',')}`
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data

  const data = await Promise.all(
    indicatorCodes.map((code) => fetchSingleIndicator(countryCode, code))
  )
  cache.set(cacheKey, { data, ts: Date.now() })
  return data
}

export function formatIndicatorValue(code: string, value: number | null): string {
  if (value === null) return 'N/A'
  if (code === 'NY.GDP.MKTP.CD') {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)} trillion`
    if (value >= 1e9)  return `$${(value / 1e9).toFixed(1)} billion`
    return `$${value.toLocaleString()}`
  }
  return `${value.toFixed(1)}%`
}
```

- [ ] **Step 4: Run tests to verify pass**

```bash
npx jest __tests__/lib/worldbank.test.ts
```
Expected: PASS (all 7 assertions green)

- [ ] **Step 5: Commit**

```bash
git add lib/worldbank.ts __tests__/lib/worldbank.test.ts
git commit -m "feat: add World Bank API client with caching, country list, and null-safe formatter"
```

---

## Task 4: Prompts

**Files:**
- Create: `lib/prompts.ts`
- Create: `__tests__/lib/prompts.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/lib/prompts.test.ts`:
```ts
import { createBriefingSystemPrompt, createBriefingUserPrompt, createChatSystemPrompt } from '@/lib/prompts'
import type { WorldBankIndicator, Briefing } from '@/types'

const mockIndicators: WorldBankIndicator[] = [
  { code: 'NY.GDP.MKTP.KD.ZG', name: 'GDP growth (annual %)', value: 5.1, year: 2023, unit: '%' },
  { code: 'FP.CPI.TOTL.ZG', name: 'Inflation (CPI)', value: 3.7, year: 2023, unit: '%' },
]

const mockBriefing: Briefing = {
  title: 'Indonesia: A Steady Hand',
  executive_summary: "Southeast Asia's largest economy navigates headwinds.",
  key_indicators: mockIndicators,
  risks: ['Commodity dependence'],
  opportunities: ['Nickel supply chain'],
  what_to_watch: ['Bank Indonesia rates'],
  bottom_line: 'Cautious optimism warranted.',
  generated_at: '2024-01-01T00:00:00Z',
  country_code: 'ID',
  country_name: 'Indonesia',
  data_year: 2023,
}

describe('createBriefingSystemPrompt', () => {
  it('returns a non-empty string', () => {
    const prompt = createBriefingSystemPrompt()
    expect(typeof prompt).toBe('string')
    expect(prompt.length).toBeGreaterThan(100)
  })

  it('instructs JSON output', () => {
    expect(createBriefingSystemPrompt().toLowerCase()).toContain('json')
  })
})

describe('createBriefingUserPrompt', () => {
  it('includes country name', () => {
    const prompt = createBriefingUserPrompt('Indonesia', 'ID', mockIndicators)
    expect(prompt).toContain('Indonesia')
  })

  it('includes actual indicator value', () => {
    const prompt = createBriefingUserPrompt('Indonesia', 'ID', mockIndicators)
    expect(prompt).toContain('5.1')
  })

  it('instructs not to invent numbers', () => {
    const prompt = createBriefingUserPrompt('Indonesia', 'ID', mockIndicators)
    expect(prompt).toMatch(/do not invent|use these exact/i)
  })
})

describe('createChatSystemPrompt', () => {
  it('includes country name from briefing', () => {
    const prompt = createChatSystemPrompt(mockBriefing, mockIndicators)
    expect(prompt).toContain('Indonesia')
  })

  it('includes indicator value in context block', () => {
    const prompt = createChatSystemPrompt(mockBriefing, mockIndicators)
    expect(prompt).toContain('5.1')
  })
})
```

- [ ] **Step 2: Run to see it fail**

```bash
npx jest __tests__/lib/prompts.test.ts
```
Expected: FAIL — `Cannot find module '@/lib/prompts'`

- [ ] **Step 3: Create lib/prompts.ts**

```ts
import type { Briefing, WorldBankIndicator } from '@/types'
import { formatIndicatorValue } from './worldbank'

export function createBriefingSystemPrompt(): string {
  return `You are a senior staff writer at The Economist, specialising in economic analysis of emerging markets.

You write with authority, precision, and dry wit. Prose is concise — short sentences, no filler, no clichés. Use precise qualifiers ("this is unlikely to…", "the evidence suggests…"). Sceptical of hype. Global perspective.

Your task: produce a structured economic briefing in valid JSON. Do not include markdown fences or any text outside the JSON object.

Return exactly this shape:
{
  "title": "string — punchy, Economist-style headline (e.g. 'Indonesia: Steady as She Goes')",
  "executive_summary": "string — 2-3 sentences, authoritative overview",
  "key_indicators": [
    {
      "name": "string",
      "value": "string — formatted with units",
      "trend": "string — 'rising' | 'falling' | 'stable' | null",
      "note": "string — one-sentence context, or null"
    }
  ],
  "risks": ["string — concise risk statement"],
  "opportunities": ["string — concise opportunity statement"],
  "what_to_watch": ["string — near-term indicator or event"],
  "bottom_line": "string — one punchy sentence, the so-what"
}

Style rules:
- Never use "robust", "vibrant", "exciting", "amazing", or superlatives
- Prefer "is unlikely to" over "will not"
- If data is missing, note it briefly and continue
- bottom_line must be exactly one sentence`
}

export function createBriefingUserPrompt(
  countryName: string,
  countryCode: string,
  indicators: WorldBankIndicator[]
): string {
  const dataBlock = indicators
    .map((ind) => {
      const val = formatIndicatorValue(ind.code, ind.value)
      const yr = ind.year ? ` (${ind.year})` : ' (year unavailable)'
      return `- ${ind.name}: ${val}${yr}`
    })
    .join('\n')

  return `Generate a structured economic briefing for ${countryName} (${countryCode}).

Use these exact figures from the World Bank. Do not invent numbers or substitute different data:

${dataBlock}

If a value shows N/A, acknowledge the data gap briefly. Return only the JSON object — no markdown, no preamble.`
}

export function createChatSystemPrompt(
  briefing: Briefing,
  indicators: WorldBankIndicator[]
): string {
  const indicatorBlock = indicators
    .map((ind) => {
      const val = formatIndicatorValue(ind.code, ind.value)
      const yr = ind.year ? ` (${ind.year})` : ''
      return `- ${ind.name}: ${val}${yr}`
    })
    .join('\n')

  return `You are a senior analyst at The Economist Intelligence Unit, answering follow-up questions about this briefing on ${briefing.country_name}.

## Current Briefing
**${briefing.title}**

${briefing.executive_summary}

**Key Indicators (World Bank data):**
${indicatorBlock}

**Risks:** ${briefing.risks.join('; ')}
**Opportunities:** ${briefing.opportunities.join('; ')}
**Bottom line:** ${briefing.bottom_line}

## Your role
- Answer questions about this briefing and broader economic context
- Reference specific data points when relevant
- Maintain The Economist's voice: precise, authoritative, slightly dry
- Acknowledge uncertainty where it exists
- Keep responses to 2–4 sentences unless the question demands more
- Never open with "Great question!" or any filler
- Use "is likely to" and "suggests" rather than definitive future claims`
}
```

- [ ] **Step 4: Run tests to verify pass**

```bash
npx jest __tests__/lib/prompts.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/prompts.ts __tests__/lib/prompts.test.ts
git commit -m "feat: add Economist-voice prompts for briefing generation and contextual chat"
```

---

## Task 5: Anthropic Client Helper

**Files:**
- Create: `lib/anthropic.ts`

(Wrapper around SDK — tested implicitly in Task 6 via type-check + integration.)

- [ ] **Step 1: Create lib/anthropic.ts**

```ts
import Anthropic from '@anthropic-ai/sdk'

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY is not set in environment')
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export const MODEL = 'claude-sonnet-4-6'

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
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add lib/anthropic.ts
git commit -m "feat: add Anthropic client singleton and stream-to-ReadableStream helper"
```

---

## Task 6: Generate Brief API Route

**Files:**
- Create: `app/api/generate-brief/route.ts`

- [ ] **Step 1: Create route.ts**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { anthropic, MODEL } from '@/lib/anthropic'
import { fetchIndicators } from '@/lib/worldbank'
import { createBriefingSystemPrompt, createBriefingUserPrompt } from '@/lib/prompts'
import type { GenerateBriefRequest, Briefing } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GenerateBriefRequest
    const { countryCode, countryName } = body

    if (!countryCode || !countryName) {
      return NextResponse.json(
        { error: 'countryCode and countryName are required' },
        { status: 400 }
      )
    }

    const indicators = await fetchIndicators(countryCode)

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: createBriefingSystemPrompt(),
      messages: [
        {
          role: 'user',
          content: createBriefingUserPrompt(countryName, countryCode, indicators),
        },
      ],
    })

    const rawText = message.content[0].type === 'text' ? message.content[0].text : ''

    let parsedData: Record<string, unknown>
    try {
      parsedData = JSON.parse(rawText)
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse JSON from model', raw: rawText },
        { status: 500 }
      )
    }

    const latestYear = indicators.find((i) => i.year !== null)?.year ?? null

    const briefing: Briefing = {
      title: String(parsedData.title ?? ''),
      executive_summary: String(parsedData.executive_summary ?? ''),
      key_indicators: indicators,
      risks: Array.isArray(parsedData.risks) ? (parsedData.risks as string[]) : [],
      opportunities: Array.isArray(parsedData.opportunities) ? (parsedData.opportunities as string[]) : [],
      what_to_watch: Array.isArray(parsedData.what_to_watch) ? (parsedData.what_to_watch as string[]) : [],
      bottom_line: String(parsedData.bottom_line ?? ''),
      generated_at: new Date().toISOString(),
      country_code: countryCode,
      country_name: countryName,
      data_year: latestYear,
    }

    return NextResponse.json({ briefing, indicators })
  } catch (err) {
    console.error('[generate-brief]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add app/api/generate-brief/route.ts
git commit -m "feat: add briefing generation API route with World Bank data grounding"
```

---

## Task 7: Chat API Route

**Files:**
- Create: `app/api/chat/route.ts`

- [ ] **Step 1: Create route.ts**

```ts
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
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add app/api/chat/route.ts
git commit -m "feat: add streaming chat API route with briefing context injection"
```

---

## Task 8: CountrySelector Component

**Files:**
- Create: `app/components/CountrySelector.tsx`
- Create: `__tests__/components/CountrySelector.test.tsx`

- [ ] **Step 1: Write failing test**

Create `__tests__/components/CountrySelector.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import CountrySelector from '@/app/components/CountrySelector'

const mockCountries = [
  { code: 'ID', name: 'Indonesia' },
  { code: 'MY', name: 'Malaysia' },
]

describe('CountrySelector', () => {
  it('renders with placeholder text', () => {
    render(<CountrySelector countries={mockCountries} onSelect={jest.fn()} />)
    expect(screen.getByText(/select a country/i)).toBeInTheDocument()
  })

  it('calls onSelect with the correct country object', () => {
    const onSelect = jest.fn()
    render(<CountrySelector countries={mockCountries} onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('combobox'))
    fireEvent.click(screen.getByText('Indonesia'))
    expect(onSelect).toHaveBeenCalledWith({ code: 'ID', name: 'Indonesia' })
  })

  it('disables the combobox when isLoading is true', () => {
    render(<CountrySelector countries={mockCountries} onSelect={jest.fn()} isLoading />)
    expect(screen.getByRole('combobox')).toBeDisabled()
  })
})
```

- [ ] **Step 2: Run to see it fail**

```bash
npx jest __tests__/components/CountrySelector.test.tsx
```
Expected: FAIL

- [ ] **Step 3: Create app/components/CountrySelector.tsx**

```tsx
'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Country } from '@/types'

interface CountrySelectorProps {
  countries: Country[]
  onSelect: (country: Country) => void
  selectedCode?: string
  isLoading?: boolean
}

export default function CountrySelector({
  countries,
  onSelect,
  selectedCode,
  isLoading,
}: CountrySelectorProps) {
  function handleValueChange(code: string) {
    const country = countries.find((c) => c.code === code)
    if (country) onSelect(country)
  }

  return (
    <Select value={selectedCode} onValueChange={handleValueChange} disabled={isLoading}>
      <SelectTrigger className="w-[240px] border-gray-300 font-medium">
        <SelectValue placeholder="Select a country" />
      </SelectTrigger>
      <SelectContent>
        {countries.map((c) => (
          <SelectItem key={c.code} value={c.code}>
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
```

- [ ] **Step 4: Run tests**

```bash
npx jest __tests__/components/CountrySelector.test.tsx
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/components/CountrySelector.tsx __tests__/components/CountrySelector.test.tsx
git commit -m "feat: add CountrySelector component with loading/disabled state"
```

---

## Task 9: IndicatorChart Component

**Files:**
- Create: `app/components/IndicatorChart.tsx`
- Create: `__tests__/components/IndicatorChart.test.tsx`

- [ ] **Step 1: Write failing test**

Create `__tests__/components/IndicatorChart.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import IndicatorChart from '@/app/components/IndicatorChart'
import type { WorldBankIndicator } from '@/types'

global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

const mockIndicators: WorldBankIndicator[] = [
  { code: 'NY.GDP.MKTP.KD.ZG', name: 'GDP growth (annual %)', value: 5.1, year: 2023, unit: '%' },
  { code: 'FP.CPI.TOTL.ZG', name: 'Inflation (CPI)', value: 3.7, year: 2023, unit: '%' },
]

describe('IndicatorChart', () => {
  it('renders indicator names', () => {
    render(<IndicatorChart indicators={mockIndicators} />)
    expect(screen.getByText(/GDP growth/i)).toBeInTheDocument()
  })

  it('renders formatted value', () => {
    render(<IndicatorChart indicators={mockIndicators} />)
    expect(screen.getByText('5.1%')).toBeInTheDocument()
  })

  it('renders N/A for null value', () => {
    const nullIndicator: WorldBankIndicator = {
      code: 'SL.UEM.TOTL.ZS',
      name: 'Unemployment',
      value: null,
      year: null,
      unit: '%',
    }
    render(<IndicatorChart indicators={[nullIndicator]} />)
    expect(screen.getByText('N/A')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to see it fail**

```bash
npx jest __tests__/components/IndicatorChart.test.tsx
```
Expected: FAIL

- [ ] **Step 3: Create app/components/IndicatorChart.tsx**

```tsx
'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { formatIndicatorValue } from '@/lib/worldbank'
import type { WorldBankIndicator } from '@/types'

interface IndicatorChartProps {
  indicators: WorldBankIndicator[]
}

function TrendIcon({ value }: { value: number | null }) {
  if (value === null) return <Minus className="h-4 w-4 text-gray-400" />
  if (value > 0) return <TrendingUp className="h-4 w-4 text-green-600" />
  return <TrendingDown className="h-4 w-4 text-red-600" />
}

export default function IndicatorChart({ indicators }: IndicatorChartProps) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {indicators.map((ind) => (
        <div
          key={ind.code}
          className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 leading-tight">
            {ind.name}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold text-[#1A1A1A]">
              {formatIndicatorValue(ind.code, ind.value)}
            </span>
            <TrendIcon value={ind.value} />
          </div>
          {ind.year && (
            <p className="mt-1 text-xs text-gray-400">{ind.year}</p>
          )}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run tests**

```bash
npx jest __tests__/components/IndicatorChart.test.tsx
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/components/IndicatorChart.tsx __tests__/components/IndicatorChart.test.tsx
git commit -m "feat: add IndicatorChart KPI grid with trend icons and N/A handling"
```

---

## Task 10: BriefingCard Component

**Files:**
- Create: `app/components/BriefingCard.tsx`
- Create: `__tests__/components/BriefingCard.test.tsx`

- [ ] **Step 1: Write failing test**

Create `__tests__/components/BriefingCard.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import BriefingCard from '@/app/components/BriefingCard'
import type { Briefing, WorldBankIndicator } from '@/types'

global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

const mockIndicators: WorldBankIndicator[] = [
  { code: 'NY.GDP.MKTP.KD.ZG', name: 'GDP growth', value: 5.1, year: 2023, unit: '%' },
]

const mockBriefing: Briefing = {
  title: 'Indonesia: Steady as She Goes',
  executive_summary: "Southeast Asia's largest economy navigates commodity headwinds.",
  key_indicators: mockIndicators,
  risks: ['Commodity price volatility', 'Weak global demand'],
  opportunities: ['Nickel supply chain position'],
  what_to_watch: ['Bank Indonesia rate decisions'],
  bottom_line: "Indonesia's fundamentals remain sound.",
  generated_at: '2024-01-15T10:30:00Z',
  country_code: 'ID',
  country_name: 'Indonesia',
  data_year: 2023,
}

describe('BriefingCard', () => {
  it('renders the title', () => {
    render(<BriefingCard briefing={mockBriefing} indicators={mockIndicators} />)
    expect(screen.getByText('Indonesia: Steady as She Goes')).toBeInTheDocument()
  })

  it('renders the executive summary', () => {
    render(<BriefingCard briefing={mockBriefing} indicators={mockIndicators} />)
    expect(screen.getByText(/commodity headwinds/i)).toBeInTheDocument()
  })

  it('renders a risk item', () => {
    render(<BriefingCard briefing={mockBriefing} indicators={mockIndicators} />)
    expect(screen.getByText('Commodity price volatility')).toBeInTheDocument()
  })

  it('renders the bottom line', () => {
    render(<BriefingCard briefing={mockBriefing} indicators={mockIndicators} />)
    expect(screen.getByText(/fundamentals remain sound/i)).toBeInTheDocument()
  })

  it('shows Prototype badge', () => {
    render(<BriefingCard briefing={mockBriefing} indicators={mockIndicators} />)
    expect(screen.getByText(/prototype/i)).toBeInTheDocument()
  })

  it('shows data year', () => {
    render(<BriefingCard briefing={mockBriefing} indicators={mockIndicators} />)
    expect(screen.getByText(/2023/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to see it fail**

```bash
npx jest __tests__/components/BriefingCard.test.tsx
```
Expected: FAIL

- [ ] **Step 3: Create app/components/BriefingCard.tsx**

```tsx
'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import IndicatorChart from './IndicatorChart'
import type { Briefing, WorldBankIndicator } from '@/types'
import { format } from 'date-fns'
import { AlertTriangle, TrendingUp, Eye } from 'lucide-react'

interface BriefingCardProps {
  briefing: Briefing
  indicators: WorldBankIndicator[]
}

function Section({
  icon,
  title,
  items,
}: {
  icon: React.ReactNode
  title: string
  items: string[]
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">{title}</h3>
      </div>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
            <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-[#E3120B]" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function BriefingCard({ briefing, indicators }: BriefingCardProps) {
  return (
    <Card className="overflow-hidden border-0 shadow-lg">
      <div className="h-1 w-full bg-[#E3120B]" />
      <CardHeader className="space-y-3 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#E3120B]">
              The Pulse — Economic Briefing
            </p>
            <h1 className="mt-1 text-2xl font-bold leading-tight text-[#1A1A1A]">
              {briefing.title}
            </h1>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <Badge className="border-amber-200 bg-amber-50 text-amber-700 text-xs font-medium">
              Prototype
            </Badge>
            {briefing.data_year && (
              <Badge variant="outline" className="text-xs text-gray-500">
                World Bank data · {briefing.data_year}
              </Badge>
            )}
          </div>
        </div>
        <p className="text-base leading-relaxed text-gray-700">{briefing.executive_summary}</p>
      </CardHeader>

      <CardContent className="space-y-6">
        <IndicatorChart indicators={indicators} />

        <Separator />

        <div className="grid gap-6 md:grid-cols-3">
          <Section
            icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
            title="Risks"
            items={briefing.risks}
          />
          <Section
            icon={<TrendingUp className="h-4 w-4 text-green-600" />}
            title="Opportunities"
            items={briefing.opportunities}
          />
          <Section
            icon={<Eye className="h-4 w-4 text-blue-500" />}
            title="What to Watch"
            items={briefing.what_to_watch}
          />
        </div>

        <Separator />

        <div className="rounded-md bg-[#1A1A1A] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Bottom Line
          </p>
          <p className="mt-1 text-sm font-medium leading-relaxed text-white">
            {briefing.bottom_line}
          </p>
        </div>

        <p className="text-right text-xs text-gray-400">
          Generated {format(new Date(briefing.generated_at), 'PPP p')}
        </p>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 4: Run tests**

```bash
npx jest __tests__/components/BriefingCard.test.tsx
```
Expected: PASS (6 assertions)

- [ ] **Step 5: Commit**

```bash
git add app/components/BriefingCard.tsx __tests__/components/BriefingCard.test.tsx
git commit -m "feat: add BriefingCard with indicators, risks, opportunities, and dark bottom line"
```

---

## Task 11: ChatInterface Component

**Files:**
- Create: `app/components/ChatInterface.tsx`
- Create: `__tests__/components/ChatInterface.test.tsx`

- [ ] **Step 1: Write failing test**

Create `__tests__/components/ChatInterface.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import ChatInterface from '@/app/components/ChatInterface'
import type { Briefing } from '@/types'

const mockBriefing: Briefing = {
  title: 'Test Briefing',
  executive_summary: 'Summary.',
  key_indicators: [],
  risks: [],
  opportunities: [],
  what_to_watch: [],
  bottom_line: 'Bottom line.',
  generated_at: new Date().toISOString(),
  country_code: 'ID',
  country_name: 'Indonesia',
  data_year: 2023,
}

describe('ChatInterface', () => {
  it('renders the chat input', () => {
    render(<ChatInterface briefing={mockBriefing} worldBankData={[]} />)
    expect(screen.getByPlaceholderText(/ask about/i)).toBeInTheDocument()
  })

  it('shows welcome message with suggested questions', () => {
    render(<ChatInterface briefing={mockBriefing} worldBankData={[]} />)
    expect(screen.getByText(/ask me anything/i)).toBeInTheDocument()
  })

  it('disables input when disabled prop is true', () => {
    render(<ChatInterface briefing={mockBriefing} worldBankData={[]} disabled />)
    expect(screen.getByPlaceholderText(/ask about/i)).toBeDisabled()
  })

  it('shows country name in header', () => {
    render(<ChatInterface briefing={mockBriefing} worldBankData={[]} />)
    expect(screen.getByText(/Indonesia/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to see it fail**

```bash
npx jest __tests__/components/ChatInterface.test.tsx
```
Expected: FAIL

- [ ] **Step 3: Create app/components/ChatInterface.tsx**

```tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { SendHorizonal, Bot, User } from 'lucide-react'
import type { Briefing, Message, WorldBankIndicator } from '@/types'

interface ChatInterfaceProps {
  briefing: Briefing
  worldBankData: WorldBankIndicator[]
  disabled?: boolean
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
  }, [messages])

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
        <p className="text-xs text-gray-500">Ask about {briefing.country_name}'s economy</p>
      </div>

      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
            <Bot className="h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-400">Ask me anything about this briefing</p>
            <div className="mt-1 flex flex-col gap-2 w-full">
              {SUGGESTED_QUESTIONS.map((q) => (
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
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#1A1A1A] text-white'
                  : 'bg-gray-50 text-gray-800'
              }`}
            >
              {msg.content ||
                (isStreaming && i === messages.length - 1 ? (
                  <span className="animate-pulse text-gray-400">▌</span>
                ) : null)}
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
```

- [ ] **Step 4: Run tests**

```bash
npx jest __tests__/components/ChatInterface.test.tsx
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/components/ChatInterface.tsx __tests__/components/ChatInterface.test.tsx
git commit -m "feat: add streaming ChatInterface with suggested questions and message history"
```

---

## Task 12: Main Page + Layout

**Files:**
- Create: `app/(main)/page.tsx`
- Modify: `app/(main)/layout.tsx`
- Modify: `app/(main)/globals.css`

- [ ] **Step 1: Create app/(main)/page.tsx**

```tsx
'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Newspaper } from 'lucide-react'
import CountrySelector from '../components/CountrySelector'
import BriefingCard from '../components/BriefingCard'
import ChatInterface from '../components/ChatInterface'
import { Button } from '@/components/ui/button'
import { COUNTRIES } from '@/lib/worldbank'
import type { Briefing, Country, WorldBankIndicator } from '@/types'

type AppState = 'idle' | 'loading' | 'ready'

export default function HomePage() {
  const [appState, setAppState] = useState<AppState>('idle')
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null)
  const [briefing, setBriefing] = useState<Briefing | null>(null)
  const [indicators, setIndicators] = useState<WorldBankIndicator[]>([])

  async function handleGenerate() {
    if (!selectedCountry) return
    setAppState('loading')
    setBriefing(null)

    try {
      const res = await fetch('/api/generate-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          countryCode: selectedCountry.code,
          countryName: selectedCountry.name,
        }),
      })

      if (!res.ok) throw new Error('Failed to generate briefing')

      const data = (await res.json()) as { briefing: Briefing; indicators: WorldBankIndicator[] }
      setBriefing(data.briefing)
      setIndicators(data.indicators)
      setAppState('ready')
    } catch {
      toast.error('Failed to generate briefing. Please try again.')
      setAppState('idle')
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b-2 border-[#E3120B] bg-[#1A1A1A] text-white">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-[#E3120B]">
                <Newspaper className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight">The Pulse</h1>
                <p className="text-xs text-gray-400">AI-Powered Economic Briefing</p>
              </div>
            </div>
            <span className="rounded border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-xs text-amber-300">
              Prototype — not official Economist content
            </span>
          </div>
        </div>
      </header>

      {/* Controls */}
      <div className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <p className="text-sm font-medium text-[#1A1A1A]">Select a country</p>
              <p className="text-xs text-gray-500">Grounded in latest World Bank public data</p>
            </div>
            <CountrySelector
              countries={COUNTRIES}
              onSelect={setSelectedCountry}
              selectedCode={selectedCountry?.code}
              isLoading={appState === 'loading'}
            />
            <Button
              onClick={handleGenerate}
              disabled={!selectedCountry || appState === 'loading'}
              className="bg-[#E3120B] text-white hover:bg-[#E3120B]/90"
            >
              {appState === 'loading' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Briefing…
                </>
              ) : (
                'Generate Brief'
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-4 py-8">
        {appState === 'idle' && (
          <div className="rounded-lg border-2 border-dashed border-gray-200 py-24 text-center">
            <Newspaper className="mx-auto mb-4 h-12 w-12 text-gray-300" />
            <p className="text-lg font-medium text-gray-400">
              Select a country to generate your briefing
            </p>
            <p className="mt-1 text-sm text-gray-400">
              Default focus: Indonesia / Southeast Asia
            </p>
          </div>
        )}

        {appState === 'loading' && (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="mb-4 h-10 w-10 animate-spin text-[#E3120B]" />
            <p className="text-gray-500">Fetching World Bank data and generating brief…</p>
          </div>
        )}

        {appState === 'ready' && briefing && (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <BriefingCard briefing={briefing} indicators={indicators} />
            <ChatInterface briefing={briefing} worldBankData={indicators} />
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-16 border-t border-gray-200 py-6">
        <div className="mx-auto max-w-6xl px-4 text-center text-xs text-gray-400">
          Prototype built for The Economist interview — demonstrates AI Lab-style experimentation
          with grounded analysis and conversational depth. Data: World Bank Open Data.
          Not affiliated with The Economist Group.
        </div>
      </footer>
    </main>
  )
}
```

- [ ] **Step 2: Update app/(main)/layout.tsx**

Replace entire file:
```tsx
import type { Metadata } from 'next'
import { Toaster } from 'sonner'
import './globals.css'

export const metadata: Metadata = {
  title: 'The Pulse — AI Economic Briefing',
  description:
    "AI-powered economic briefings in The Economist's voice, grounded in World Bank data.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Update app/(main)/globals.css**

Add after the Tailwind directives:
```css
@layer base {
  body {
    font-feature-settings: 'kern' 1, 'liga' 1;
    -webkit-font-smoothing: antialiased;
  }

  h1, h2, h3 {
    letter-spacing: -0.02em;
  }
}
```

- [ ] **Step 4: Verify build succeeds**

```bash
npm run build
```
Expected: Build completes with no type errors. Fix any reported errors before continuing.

- [ ] **Step 5: Commit**

```bash
git add app/(main)/page.tsx app/(main)/layout.tsx app/(main)/globals.css
git commit -m "feat: assemble main page with selector, briefing display, and chat layout"
```

---

## Task 13: Verification Pass

**Files:** none (verification only)

- [ ] **Step 1: Run all tests**

```bash
npx jest
```
Expected: All suites PASS. Fix any failures before continuing.

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Start dev server**

```bash
npm run dev
```
Open http://localhost:3000

- [ ] **Step 4: Verify golden path**

Test each step manually:
1. Page loads — header, empty state placeholder visible
2. Open country selector — 22 countries listed
3. Select "Indonesia" — selector shows "Indonesia"
4. Click "Generate Brief" — loading spinner appears
5. Briefing renders — title, 4 KPI tiles, risks, opportunities, what to watch, bottom line, Prototype badge, data year badge
6. Chat panel renders with 3 suggested questions
7. Click a suggested question — text populates in input
8. Submit — streaming response appears token by token
9. Type follow-up question — second exchange works

- [ ] **Step 5: Verify error resilience**

Temporarily break `ANTHROPIC_API_KEY` in .env.local. Reload and click Generate Brief. Expected: sonner toast appears "Failed to generate briefing. Please try again." — no white screen.

Restore the key.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore: verify MVP complete — all tests pass, golden path confirmed"
```

---

## Self-Review

### Spec Coverage

| Requirement | Task |
|---|---|
| Briefing generation with real World Bank data | Tasks 3, 6 |
| Economist tone/voice control | Task 4 |
| Streaming chat referencing briefing | Tasks 7, 11 |
| Clean professional UI | Tasks 8–12 |
| Prototype labeling | Tasks 10, 12 |
| Graceful degradation if WB fails | Task 3 (null-safe) |
| Loading states + toasts | Tasks 11, 12 |
| TypeScript strict mode | All tasks |
| Exact WB figures injected into prompt | Tasks 3, 4, 6 |
| "Do not invent numbers" instruction | Task 4 |
| Chat maintains 6–8 message history | Task 7 |
| shadcn/ui components | Tasks 1, 8, 10, 11 |
| lucide-react icons | Tasks 9, 10, 11, 12 |
| sonner toasts | Tasks 1, 12 |
| date-fns date formatting | Task 10 |

### Placeholder Scan
No TBDs, TODOs, or "similar to Task N" shortcuts present.

### Type Consistency
- `WorldBankIndicator` defined Task 2, imported in Tasks 3, 4, 6, 7, 9, 10, 11, 12 — consistent shape throughout
- `Briefing` defined Task 2, consumed in Tasks 6, 7, 10, 11, 12 — consistent
- `fetchIndicators` returns `WorldBankIndicator[]` (Task 3), consumed correctly in Task 6 as `indicators`
- `createChatSystemPrompt` (Task 4) accepts `(Briefing, WorldBankIndicator[])` — matches Task 7 call site exactly
- `streamToReadableStream` (Task 5) wraps `anthropic.messages.stream(...)` return — matches Task 7 usage
