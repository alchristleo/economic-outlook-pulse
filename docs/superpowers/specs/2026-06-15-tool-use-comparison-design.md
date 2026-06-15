# Tool Use in Chat + Multi-Country Comparison — Design Spec

**Date:** 2026-06-15
**Feature:** Agentic tool use in chat with inline country comparison card
**Status:** Approved

---

## Goal

Enable Claude to call a live data tool mid-conversation, fetch IMF indicators for up to 3 comparison countries, and render a styled `ComparisonCard` inline in the chat response. Demonstrates real agentic behavior — Claude decides when to fetch data, not the client.

---

## Architecture

```
User: "Compare Indonesia to Vietnam and Malaysia"
  │
  ▼
POST /api/chat  (existing route, extended)
  │
  ├─ Tool loop (non-streaming, request-response):
  │   ├─ Claude sees tool definition: fetch_country_indicators(country_code)
  │   ├─ Calls it up to 3× (one per comparison country, parallel)
  │   ├─ Server validates each code against COUNTRIES allowlist → HTTP 400 on violation
  │   ├─ Executes fetchIndicators(countryCode) → real IMF WEO data
  │   └─ Returns tool results to Claude; loop repeats until stop_reason !== 'tool_use'
  │
  └─ Final response (streaming):
      Claude writes narrative analysis + embeds structured marker:
        [COMPARISON_DATA]{...}[/COMPARISON_DATA]
      Server streams text; client strips marker → renders ComparisonCard
      Remaining text streams as normal chat message
```

**Tool loop is non-streaming.** Tool execution is inherently request-response. Once the loop resolves, the final text response streams for fast perceived latency.

---

## Tool Definition

Single tool exposed to Claude in the chat system prompt:

```ts
const CHAT_TOOLS: Anthropic.Tool[] = [
  {
    name: 'fetch_country_indicators',
    description:
      'Fetch real IMF economic indicators for a country. Use when the user asks to compare with another country or requests data on a country other than the current briefing subject. Call once per country. Maximum 3 calls per response.',
    input_schema: {
      type: 'object' as const,
      properties: {
        country_code: {
          type: 'string',
          description: "ISO alpha-2 country code, e.g. 'VN' for Vietnam, 'MY' for Malaysia",
        },
      },
      required: ['country_code'],
    },
  },
]
```

---

## Security

- `country_code` validated against `COUNTRIES` allowlist (from `lib/worldbank.ts`) before any fetch.
- Unknown or unrecognised code → tool returns `{ error: "Unknown country code" }`. Claude handles gracefully in text ("I couldn't find data for that country").
- System prompt injection guard remains in place for the chat route.
- Cap tool loop at **5 iterations max** to prevent runaway loops.

---

## Data Flow

### Request shape (unchanged)
```ts
POST /api/chat
{ messages: Message[], briefing: Briefing, worldBankData: WorldBankIndicator[] }
```

### Tool execution (server-side)
```ts
async function executeToolCall(name: string, input: Record<string, unknown>): Promise<string> {
  if (name === 'fetch_country_indicators') {
    const code = String(input.country_code ?? '').toUpperCase()
    const country = COUNTRIES.find((c) => c.code === code)
    if (!country) return JSON.stringify({ error: 'Unknown country code' })
    const indicators = await fetchIndicators(code)
    return JSON.stringify({ country_code: code, country_name: country.name, indicators })
  }
  return JSON.stringify({ error: 'Unknown tool' })
}
```

### Agentic loop
```ts
let response = await anthropic.messages.create({ model, tools, messages })
let iterations = 0

while (response.stop_reason === 'tool_use' && iterations < 5) {
  const toolResults = await Promise.all(
    response.content
      .filter((b) => b.type === 'tool_use')
      .map(async (b) => ({
        type: 'tool_result' as const,
        tool_use_id: (b as Anthropic.ToolUseBlock).id,
        content: await executeToolCall(
          (b as Anthropic.ToolUseBlock).name,
          (b as Anthropic.ToolUseBlock).input as Record<string, unknown>
        ),
      }))
  )
  messages = [...messages, { role: 'assistant', content: response.content }, { role: 'user', content: toolResults }]
  response = await anthropic.messages.create({ model, tools, messages })
  iterations++
}

// Stream final response
```

### Comparison data marker
Claude is instructed in the system prompt to embed comparison data when it has fetched indicators:

```
When you have fetched indicators for comparison countries, embed the comparison data
in your response using this exact format (no spaces around the tags):
[COMPARISON_DATA]{"base_country_code":"ID","countries":[{"code":"VN","name":"Vietnam","indicators":[...]},{"code":"MY","name":"Malaysia","indicators":[...]}]}[/COMPARISON_DATA]

Place the marker on its own line before your narrative analysis. Do not include it if no tool was called.
```

### Client parsing
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
    return { text: raw, comparisonData: null }
  }
}
```

---

## New Types

```ts
// types/index.ts additions

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

---

## ComparisonCard Component

**File:** `app/components/ComparisonCard.tsx`

**Layout:** Styled card using shadcn/ui `Card`. Table rows for each indicator. Columns: base country (no color, reference) + up to 3 comparison countries.

**Indicators shown (6 rows):**
| Code | Label |
|------|-------|
| `NGDP_RPCH` | GDP growth (%) |
| `PCPIPCH` | Inflation (%) |
| `GGXCNL_NGDP` | Fiscal balance (% GDP) |
| `BCA_NGDPD` | Current account (% GDP) |
| `LUR` | Unemployment (%) |
| `GGXWDG_NGDP` | Govt debt (% GDP) |

**Color logic (direction-aware):**
- GDP growth: higher = green
- Inflation: lower = green
- Fiscal balance: higher (less negative) = green
- Current account: higher (less negative) = green
- Unemployment: lower = green
- Govt debt: lower = green

Comparison is always vs the base country value. Difference shown as colored pill: `+1.1pp` in green or `-0.8pp` in red. No color on base column.

**Null handling:** Show `—` for missing indicator values. No color pill.

**Footer:** `IMF WEO data · {latestYear} · ↑ better vs {baseCountryName}`

---

## Files Changed

| File | Change |
|------|--------|
| `app/api/chat/route.ts` | Add tool definition, agentic loop, tool execution |
| `lib/prompts.ts` | Update chat system prompt with tool instructions + marker format |
| `types/index.ts` | Add `ComparisonData`, `ComparisonCountry` |
| `app/components/ComparisonCard.tsx` | New component — styled comparison table |
| `app/components/ChatInterface.tsx` | Parse comparison marker, render `ComparisonCard` inline |

---

## Non-Goals

- No separate comparison page or side panel
- No streaming of tool execution phase (tool loop is synchronous)
- No caching of comparison fetches (session is short-lived)
- No chart visualisations inside ComparisonCard (table only for MVP)
- No saving comparison results

---

## Success Criteria

1. User types "compare to Vietnam and Malaysia" → Claude fetches both, renders `ComparisonCard` inline in chat
2. Up to 3 comparison countries work in one message
3. Invalid country code → Claude responds gracefully, no 500
4. Color coding correct: green = better than base, red = worse (direction-aware per indicator)
5. Base country column shows no color (reference only)
6. Null indicators show `—` not an error
7. If no tool called, `ComparisonCard` never renders
