# The Pulse — AI-Powered Economic Briefing

> A prototype demonstrating AI Lab-style product thinking: grounded analysis, LLM orchestration, tone control, and clean full-stack execution — built in The Economist's voice.

**Prototype** · Not official Economist content · Built for The Economist AI Lab / digital product interview

---

## What It Does

Select a country → receive a structured economic health briefing grounded in real IMF World Economic Outlook data, scored across five Dalio-inspired macro dimensions, with a live chat interface to drill deeper.

**Key capabilities:**

- **Grounded briefings** — fetches 10 IMF WEO indicators per country in parallel (including near-term projections); Claude is instructed to use the exact figures, not invent data
- **Economic Health Index** — composite 0–100 score across five dimensions (Economic Momentum, Price Stability, Fiscal Position, External Balance, Labor Market), visualised as a radar chart
- **The Economist voice** — prompt engineering enforces concise, authoritative, data-driven prose with dry understatement; no superlatives, no generic AI copy
- **Conversational analyst** — streaming chat that has full briefing + indicator context; references dimension scores in responses
- **Real-time exchange rates** — fetched from open.er-api.com alongside IMF data

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 14 (App Router) + TypeScript strict |
| Styling | Tailwind CSS v3 + shadcn/ui |
| Charts | Recharts (RadarChart) |
| LLM | Anthropic Claude `claude-sonnet-4-6` via `@anthropic-ai/sdk` |
| Economic data | IMF World Economic Outlook DataMapper API (free, no key) |
| Exchange rates | open.er-api.com (free tier) |
| Testing | Jest + SWC + @testing-library/react |

---

## Architecture

```
app/
├── page.tsx                      # Main UI: selector → briefing → chat
├── api/
│   ├── generate-brief/route.ts  # Fetches IMF data, scores, calls Claude
│   └── chat/route.ts            # Streaming chat with full briefing context
└── components/
    ├── BriefingCard.tsx          # Structured briefing display
    ├── EconomicRadar.tsx         # Recharts radar + dimension breakdown
    ├── ChatInterface.tsx         # Streaming chat with suggested questions
    └── CountrySelector.tsx       # Allowlisted country dropdown

lib/
├── imf.ts        # IMF WEO DataMapper API fetching (10 indicators, ISO2→ISO3)
├── worldbank.ts  # Country/currency metadata, exchange rate, value formatting
├── scoring.ts    # 5-dimension health scoring (0–100 composite)
├── prompts.ts    # All system prompts (briefing + chat)
└── anthropic.ts  # Reusable Claude client + streaming helper

types/index.ts    # Briefing, EconomicHealthScore, Message interfaces
```

---

## Economic Health Index

Inspired by Ray Dalio's macro framework. Five dimensions, each scored 0–10, combined into a 0–100 composite.

| Dimension | Weight | IMF Indicators |
|-----------|--------|----------------|
| Economic Momentum | 25% | Real GDP growth (`NGDP_RPCH`), Total investment % GDP (`NID_NGDP`) |
| Price Stability | 20% | CPI inflation (`PCPIPCH`) |
| Fiscal Position | 20% | Gross govt debt % GDP (`GGXWDG_NGDP`), Fiscal balance % GDP (`GGXCNL_NGDP`) |
| External Balance | 20% | Current account % GDP (`BCA_NGDPD`), Export volume growth (`TX_RPCH`) |
| Labor Market | 15% | Unemployment rate (`LUR`) |

**Sentiment thresholds:** Strong ≥ 75 · Moderate ≥ 55 · Weak ≥ 35 · Vulnerable < 35

Null indicators are skipped with weight redistribution — a partially-missing country still produces a meaningful score.

---

## IMF Data

Uses the [IMF DataMapper API](https://www.imf.org/external/datamapper/api/v1/) — free, no API key required, covers 190+ countries.

- Fetches most recent year with valid data, capped at `currentYear + 1` to avoid pulling multi-year WEO projections
- In-memory cache with 5-minute TTL to reduce repeated API calls during a session
- Graceful degradation: null indicators are excluded from dimension scoring without crashing

**Countries covered:** Indonesia, Malaysia, Thailand, Vietnam, Philippines, Singapore, India, China, Brazil, South Africa, Nigeria, Kenya, Turkey, Mexico, Argentina, Egypt, Pakistan, Bangladesh, United Kingdom, Germany, Japan, United States.

---

## Security

Non-negotiable constraints enforced throughout:

- **Country allowlist** — both API routes reject any `countryCode` not in the `COUNTRIES` allowlist (HTTP 400); `countryName` is always derived server-side, never trusted from the client
- **Prompt injection guards** — every system prompt instructs Claude to ignore role-switching, system prompt extraction, and non-economic content requests
- **Chat sanitisation** — messages capped at 2,000 chars, `role` allowlisted to `user | assistant`, content coerced to plain strings, history limited to last 8 messages

---

## Setup

### Prerequisites

- Node.js 18+
- Anthropic API key ([console.anthropic.com](https://console.anthropic.com))

### Install

```bash
git clone https://github.com/alchristleo/economic-outlook-pulse
cd economic-outlook-pulse
npm install
```

### Configure

Create `.env.local` in the project root:

```
ANTHROPIC_API_KEY=sk-ant-...
```

The IMF DataMapper API and exchange rate API require no credentials.

### Run

```bash
npm run dev       # http://localhost:3000
npm test          # 66 tests across 10 suites
npm run build     # production build check
```

---

## Key Design Decisions

**Why IMF WEO over World Bank?**
World Bank indicators typically lag 1–2 years. IMF WEO is updated biannually (April + October) with estimates for the current year and one-year projections — substantially more current for a live briefing tool.

**Why rule-based scoring over LLM scoring?**
Transparent, auditable, and consistent. Users can interrogate "why does Fiscal Position score 5.6?" with a direct answer. LLM-assigned scores would be opaque and inconsistent across requests.

**Why stream chat but not briefings?**
Briefings require structured JSON parsing for the radar chart — streaming and incrementally parsing JSON adds complexity with minimal UX gain for a ~3-second response. Chat is open-ended prose where streaming meaningfully reduces perceived latency.

**Why shadcn/ui?**
Pre-built, accessible, easily themed. Economist red (`#E3120B`) and dark (`#1A1A1A`) applied via Tailwind config — consistent premium feel without building a design system from scratch.

---

## Deployment

Designed for Vercel free tier — entirely stateless, no database required:

```bash
vercel deploy
```

Set `ANTHROPIC_API_KEY` in Vercel environment variables. All other data sources are public APIs.

---

*Prototype built for The Economist interview — demonstrates AI Lab-style experimentation with grounded analysis and conversational depth. Not affiliated with The Economist Group.*
