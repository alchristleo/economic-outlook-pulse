# Bull vs Bear Debate — Design Spec

**Date:** 2026-06-15  
**Status:** Approved

## Goal
One-click generation of a structured two-sided investment debate for the country in The Economist's voice.

## Architecture
```
"Bull vs Bear" button on BriefingCard → POST /api/debate
  ├─ Single Sonnet 4.6 call
  └─ Return DebateResult JSON → DebateCard inline in BriefingCard
```

## Types
```ts
export interface DebateResult {
  bull_case: string[]   // exactly 3 arguments
  bear_case: string[]   // exactly 3 arguments
  verdict: string       // one sentence: who wins and why
}
```

## API /api/debate
- POST body: `{ countryCode: string, briefing: Briefing }`
- Validate countryCode against COUNTRIES allowlist
- Injection guard
- Return `{ debate: DebateResult }`

## Prompt
System: EIU analyst assigned to write BOTH sides of an investment debate. Each argument: one specific sentence referencing actual data. No generic claims. Economist voice.
User: briefing JSON → DebateResult JSON

## UI
- "Bull vs Bear" button in BriefingCard header area (near existing badges)
- While loading: spinner on button, disabled
- DebateCard renders below bottom_line section of BriefingCard
- Two columns: Bull (green header, green bullets) | Bear (red header, red bullets)
- Verdict: full-width bar below columns, italic, gray bg
- Re-click clears and re-runs

## Files
| File | Action |
|------|--------|
| `types/index.ts` | Add `DebateResult` |
| `lib/prompts.ts` | Add `createDebatePrompt(briefing, indicators)` |
| `app/api/debate/route.ts` | New POST route |
| `app/components/DebateCard.tsx` | New component |
| `app/components/BriefingCard.tsx` | Add button + debate state + DebateCard |
