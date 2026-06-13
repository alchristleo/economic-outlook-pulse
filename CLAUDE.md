# Claude.md — The Pulse Project

**Project**: The Pulse — AI-Powered Economist-Style Briefing Generator + Conversational Analyst  
**Purpose**: Rapid full-stack prototype for The Economist interview (AI Lab / digital product / engineering roles). Demonstrates strong product sense, LLM orchestration, data grounding, tone control, and clean full-stack execution.  
**Tone for this project**: Professional, precise, insightful, with subtle dry wit where appropriate — exactly like The Economist itself.

---

## 1. Project Mission & Constraints

- **Goal**: Build an impressive, demo-ready MVP in 1–3 days that feels like something The Economist AI Lab might ship internally or to subscribers.
- **Core Value**: Help users quickly get rigorous, data-backed global analysis in The Economist’s distinctive voice, then explore implications through natural conversation.
- **Key Constraints**:
  - Must feel premium and on-brand (never generic AI slop).
  - Ground analysis in real public data where possible (World Bank).
  - Clearly label as a **prototype** / demo (not official Economist content).
  - Prioritize speed of iteration + high visual/UX quality over perfect production readiness.
  - No scraping or using The Economist’s copyrighted content.

**Default demo topic**: Indonesia economy / Southeast Asia topics (strong data availability + relevant to interviewer context).

---

## 2. Tech Stack (Strict)

- **Framework**: Next.js 14 (App Router) + TypeScript (strict mode)
- **Styling**: Tailwind CSS + shadcn/ui (use existing components heavily: Card, Button, Select, Dialog, Tabs, etc.)
- **Charts**: Recharts (preferred) or Chart.js
- **LLM**: Anthropic Claude (Sonnet 3.5 or Opus) via `@anthropic-ai/sdk` or Vercel AI SDK
- **Data**: World Bank Indicators API (public, no key) + REST Countries (optional)
- **State**: React hooks + `useState`/`useEffect`. TanStack Query only if chat history grows complex.
- **Deployment target**: Vercel (free tier is perfect)
- **Key libraries to prefer**:
  - `lucide-react` for icons
  - `date-fns` for dates
  - `jsPDF` or `@react-pdf/renderer` for export (keep simple)
  - `sonner` for beautiful toasts

**Do NOT** introduce: Prisma, tRPC, heavy state managers, or complex auth unless explicitly needed later.

---

## 3. Recommended Project Structure
the-pulse/
├── app/
│   ├── (main)/
│   │   ├── page.tsx                 # Landing + main interface
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── api/
│   │   ├── generate-brief/
│   │   │   └── route.ts
│   │   └── chat/
│   │       └── route.ts
│   └── components/
│       ├── BriefingCard.tsx
│       ├── ChatInterface.tsx
│       ├── CountrySelector.tsx
│       ├── IndicatorChart.tsx
│       └── ui/ (shadcn)
├── lib/
│   ├── anthropic.ts                 # Reusable client + helpers
│   ├── worldbank.ts                 # Data fetching + caching helpers
│   ├── prompts.ts                   # All system prompts + few-shot examples
│   └── utils.ts
├── types/
│   └── index.ts                     # Briefing, Message, etc. interfaces
├── public/
└── README.md

---

## 4. Core Coding Principles

1. **Clarity & Precision First** — Same standard The Economist applies to writing. Code must be readable, well-typed, and self-documenting.
2. **Component-Driven** — Build small, focused, reusable components. Prefer composition over complex props.
3. **Type Safety** — Use strict TypeScript. Define interfaces for every LLM output shape and API response.
4. **Error Handling** — Graceful degradation. If World Bank fails, still generate briefing with clear note. Never crash the UI.
5. **Loading & Feedback** — Excellent loading states, streaming chat, subtle animations. Use `sonner` toasts.
6. **Performance** — Keep initial bundle light. Server Components where possible. Stream LLM responses.
7. **No Over-Engineering** — This is an interview prototype. Ship fast, polish what users see first.

---

## 5. LLM Integration Rules (Most Important Section)

### 5.1 System Prompt Philosophy
Every prompt must enforce **The Economist voice**:
- Concise, authoritative, data-driven
- Short sentences and paragraphs
- Dry understatement or subtle wit (never try-hard humor)
- Global perspective, skeptical of hype
- Precise qualifiers (“this is unlikely to…”, “the evidence suggests…”)
- Never moralizing or overly optimistic

### 5.2 Structured Output
- Always request **JSON** output from Claude for the briefing generator.
- Define a clear Zod schema or TypeScript interface first, then instruct the model.
- Example fields for briefing:
  ```ts
  {
    title: string;
    executive_summary: string;
    key_indicators: Array<{ name: string; value: string; trend?: string; note?: string }>;
    risks: string[];
    opportunities: string[];
    what_to_watch: string[];
    bottom_line: string;
    chart_data?: { /* Recharts-friendly shape */ };
  }

5.3 Grounding Rules

When a country is selected, always fetch real indicators from World Bank first and inject the exact numbers into the prompt.
Explicitly tell the model: “Use these exact figures. Do not invent numbers.”
In the UI, show a small “Grounded in latest public data” badge + year.

5.4 Chat Context

The chat route must include the full generated briefing + fetched data in the system message.
Maintain conversation history (last 6–8 messages is enough).
Allow the model to reference specific numbers and sections from the briefing.

5.5 Prompt Location
All prompts live in lib/prompts.ts. Never hardcode long prompts inside route handlers.

6. UI & Design System

Visual Identity: Clean, modern, premium. Heavy use of white space. Economist red (#E3120B or #C8102E) as primary accent.
Typography: System sans-serif for UI, consider a refined serif for headings if it feels right (but keep simple).
Layout:
Top: Selector + Generate button
Main: Beautiful briefing card/report
Below or sidebar: Chat interface (feels like a “live correspondent”)

States: Empty → Generating → Result + Chat
Accessibility: Proper labels, keyboard navigation, sufficient contrast.
Mobile: Fully responsive. Chat should work well on smaller screens.

Never use generic AI gradients, purple/pink accents, or “futuristic” sci-fi styling.

7. Data Handling

World Bank Integration (lib/worldbank.ts):
Create a small helper that fetches multiple indicators in parallel.
Cache responses in memory (or simple Map) for the session.
Handle missing data gracefully (some indicators lag).
Useful indicators to start with:
NY.GDP.MKTP.KD.ZG — GDP growth (annual %)
FP.CPI.TOTL.ZG — Inflation, consumer prices (annual %)
NY.GDP.MKTP.CD — GDP (current US$)
SL.UEM.TOTL.ZS — Unemployment rate (optional)


Always surface the data year clearly in the UI.


8. File & Naming Conventions

Components: PascalCase (BriefingCard.tsx)
Utilities: camelCase (fetchWorldBankData)
API routes: kebab-case folders
Types: colocated in types/ or inline when small
Prompts: Clear function names like createBriefingSystemPrompt(country, data)


9. What to Prioritize in This Build
Must have for strong interview demo:

Working briefing generation with real World Bank data
Excellent Economist tone control (this is the differentiator)
Streaming chat that references the briefing
Clean, professional UI that feels premium
Clear “This is a prototype” labeling + export/save functionality

Nice to have (add only after core is solid):

PDF export
Saved briefings (localStorage)
Multi-country comparison mode
Suggested follow-up questions generated by LLM
Simple world map selector (react-leaflet)


10. Interview Talking Points (Built Into the Code)

Add a small footer or info modal: “Prototype built for The Economist interview — demonstrates AI Lab-style experimentation with grounded analysis and conversational depth.”
In code comments and README, note key decisions that show product thinking.


11. How Claude Should Work on This Project
When I ask you to implement or modify something:

First, read the relevant files to understand current state.
Propose the smallest effective change that maintains quality.
Write clean, typed, well-commented code.
Update claude.md only if a major architectural decision changes.
After changes, suggest the next logical step for the demo.
Always consider the interview audience — make the app feel thoughtful and high-signal.

Never:

Introduce unnecessary dependencies
Over-complicate state management
Generate generic AI-sounding UI copy
Ignore the Economist voice guidelines

12. Quick Start Commands (for the developer)
Bashnpx create-next-app@latest the-pulse --yes --tailwind --eslint --yes
cd the-pulse
npx shadcn@latest init
# Then install: @anthropic-ai/sdk lucide-react date-fns recharts sonner