# Investor Lens Mode — Design Spec

**Date:** 2026-06-15  
**Status:** Approved

## Goal
Reframe the same briefing through three lenses: Bond Investor, Equity Analyst, Central Banker.

## Architecture
```
Segmented control in BriefingCard → POST /api/lens (only on non-Standard tabs)
  ├─ Single Sonnet 4.6 call
  └─ LensCard inline below executive summary
  Client-side Map cache: no re-fetch on re-select
```

## Types
```ts
export type LensType = 'bond' | 'equity' | 'central_bank'

export interface LensResult {
  lens: LensType
  headline: string      // one sentence framing
  signals: string[]     // 3-4 lens-specific observations
  key_risk: string      // biggest risk for this investor type
  bottom_line: string   // one sentence verdict
}
```

## API /api/lens
- POST body: `{ countryCode: string, lens: LensType, briefing: Briefing }`
- Validate countryCode + lens (allowlist: bond/equity/central_bank)
- Return `{ result: LensResult }`

## Prompt personas
- **bond**: fiscal balance, debt/GDP, currency, sovereign spread risk
- **equity**: GDP growth, investment rate, reform momentum, earnings environment  
- **central_bank**: inflation, current account, unemployment, monetary policy space

## UI
- Segmented control: `Standard | Bond | Equity | Central Bank` — in BriefingCard below the title
- Standard = no API call, shows normal briefing
- Switching: spinner → LensCard below executive summary
- LensCard: colored left border (blue=bond, green=equity, purple=central_bank), headline bold, signals as bullets, key_risk in red pill, bottom_line italic
- Cache: `Map<string, LensResult>` keyed by `${countryCode}:${lens}` in BriefingCard state

## Files
| File | Action |
|------|--------|
| `types/index.ts` | Add `LensType`, `LensResult` |
| `lib/prompts.ts` | Add `createLensPrompt(briefing, indicators, lens)` |
| `app/api/lens/route.ts` | New POST route |
| `app/components/LensCard.tsx` | New component |
| `app/components/BriefingCard.tsx` | Add segmented control + lens state + cache + LensCard |
