# The Pulse — AI-Powered Economic Briefing

> A prototype demonstrating AI Lab-style product thinking: grounded analysis, LLM orchestration, tone control, and clean full-stack execution — built in The Economist's voice.

**Prototype** · Not official Economist content · Built for The Economist AI Lab / digital product interview

---

## What It Does

Select a country → receive a structured economic health briefing grounded in real IMF World Economic Outlook data, scored across five Dalio-inspired macro dimensions, with a live chat interface to drill deeper — plus a suite of AI-powered analytical tools.

**Core capabilities:**

- **Grounded briefings** — fetches 10 IMF WEO indicators per country in parallel (including near-term projections); Claude is instructed to use the exact figures, not invent data
- **Economic Health Index** — composite 0–100 score across five dimensions (Economic Momentum, Price Stability, Fiscal Position, External Balance, Labor Market), visualised as a radar chart
- **The Economist voice** — prompt engineering enforces concise, authoritative, data-driven prose with dry understatement; no superlatives, no generic AI copy
- **Conversational analyst** — agentic chat with native tool use (`fetch_country_indicators`); can pull live data for up to 3 countries mid-conversation and render side-by-side comparison tables
- **Real-time exchange rates** — fetched from open.er-api.com alongside IMF data

**AI Superpowers:**

- **Currency Forecast** — 24-month linear regression on IMF data with 95% confidence interval band, rendered as a Recharts ComposedChart (historical line + forecast line + shaded CI area)
- **What-If Scenario Simulator** — type any macro hypothesis ("What if oil prices halve?") and receive a structured causal chain analysis grounded in the current briefing
- **Bull vs Bear Debate** — one-click generation of a structured two-sided investment debate (3 arguments each side) in The Economist's voice, with a verdict on the key swing factor
- **Investor Lens Mode** — segmented control switches the briefing perspective: Bond Investor / Equity Analyst / Central Banker; client-side Map cache prevents re-fetches on re-select
- **vs. News** — fetches the last 7 days of GDELT headlines, passes titles to Claude, and surfaces where recent news corroborates or contradicts the analysis

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
| News | GDELT API v2 (free, no key) |
| Testing | Jest + SWC + @testing-library/react |

---

## Architecture

```
app/
├── page.tsx                       # Main UI: selector → briefing → scenario → chat
├── api/
│   ├── generate-brief/route.ts   # IMF fetch → scoring → Claude briefing JSON
│   ├── chat/route.ts             # Agentic tool-use loop (fetch_country_indicators)
│   ├── currency-forecast/route.ts# Linear regression on 24-mo IMF data + CI band
│   ├── debate/route.ts           # Bull vs Bear — 3 args each side + verdict
│   ├── lens/route.ts             # Investor Lens — bond/equity/central_bank reframe
│   ├── news-check/route.ts       # GDELT headlines → Claude corroboration/contradiction
│   └── scenario/route.ts         # What-if hypothesis → causal chain analysis
└── components/
    ├── BriefingCard.tsx          # Main briefing display + lens control + action buttons
    ├── ChatInterface.tsx         # Chat with ComparisonCard for multi-country tool use
    ├── ComparisonCard.tsx        # Side-by-side indicator table with diff pills
    ├── CountrySelector.tsx       # Allowlisted country dropdown
    ├── CurrencyForecast.tsx      # Recharts ComposedChart: historical + forecast + CI
    ├── DebateCard.tsx            # Two-column bull/bear + verdict strip
    ├── EconomicRadar.tsx         # Recharts radar + dimension breakdown table
    ├── LensCard.tsx              # Coloured left-border investor perspective card
    ├── NewsCheckCard.tsx         # GDELT reconciliation: ✓/⚠ bullets + article list
    ├── ScenarioCard.tsx          # Numbered causal chain + risks/opportunities grid
    └── ScenarioInput.tsx         # Hypothesis text input + example pills

lib/
├── imf.ts        # IMF WEO DataMapper API fetching (10 indicators, ISO2→ISO3, 5-min cache)
├── worldbank.ts  # Country list, currency metadata, exchange rate, value formatting
├── scoring.ts    # 5-dimension Dalio-inspired health scoring (0–100 composite)
├── prompts.ts    # All prompts: briefing, chat, scenario, debate, lens, news-check
└── anthropic.ts  # Claude client singleton + streamToReadableStream helper

types/index.ts    # Briefing, EconomicHealthScore, Message, ScenarioResult, DebateResult,
                  # LensType/Result, NewsArticle/CheckResult, CurrencyForecastData, etc.
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

- **Country allowlist** — all 7 API routes reject any `countryCode` not in the `COUNTRIES` allowlist (HTTP 400); `countryName` is always derived server-side, never trusted from the client
- **Lens allowlist** — `/api/lens` validates `lens` against `['bond', 'equity', 'central_bank']`
- **Hypothesis cap** — `/api/scenario` caps hypothesis input at 500 characters
- **GDELT safety** — only article titles (not full text) are passed to Claude; injection guard in system prompt ignores non-economic headlines
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
npm test          # test suite
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

**Why native Anthropic tool use for multi-country comparison?**
Claude can decide when to fetch comparison data based on conversational context — no need to add UI controls or anticipate every query. The agentic loop (max 5 iterations) handles multi-step reasoning without exposing internals to the client.

**Why GDELT for news reconciliation?**
Completely free, no API key, global coverage, 7-day lookback. Titles only are passed to Claude — not full article text — keeping token usage low and avoiding potential copyright issues with article bodies.

**Why a client-side Map cache for Investor Lens?**
Each lens reframe is expensive (one Claude call). Users frequently switch between Standard and a lens to compare — the cache makes re-selection instant. Keyed by `${countryCode}:${lens}` so a new country brief correctly triggers a fresh fetch.

---

## Deployment

Designed for Vercel free tier — entirely stateless, no database required:

```bash
vercel deploy
```

Set `ANTHROPIC_API_KEY` in Vercel environment variables. All other data sources are public APIs.

---

*Prototype built for The Economist interview — demonstrates AI Lab-style experimentation with grounded analysis and conversational depth. Not affiliated with The Economist Group.*
