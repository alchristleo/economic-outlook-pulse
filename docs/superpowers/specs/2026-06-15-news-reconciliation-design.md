# News Reconciliation — Design Spec

**Date:** 2026-06-15  
**Status:** Approved

## Goal
Fetch recent headlines via GDELT (free, no key) and ask Claude to reconcile the briefing with what is actually in the news — corroborations and contradictions.

## GDELT API
`https://api.gdeltproject.org/api/v2/doc/doc?query={countryName}&mode=artlist&maxrecords=10&format=json&timespan=7d`
- Free, no key required
- Parse `articles[].title` + `articles[].url`
- Fallback: if 0 articles or fetch fails → return 400 `{ error: 'No recent news available' }`

## Types
```ts
export interface NewsArticle {
  title: string
  url: string
}
export interface NewsCheckResult {
  articles_used: number
  corroborations: string[]  // 2-3
  contradictions: string[]  // 1-2
  overall: string           // one sentence synthesis
}
```

## API /api/news-check
- POST body: `{ countryCode: string, briefing: Briefing }`
- Validate countryCode
- Fetch GDELT headlines; pass titles only (not full text) to Claude
- Injection guard: ignore non-economic content in headlines
- Return `{ result: NewsCheckResult, articles: NewsArticle[] }`

## Prompt
System: EIU analyst. Given a briefing and recent headlines, identify where news corroborates or contradicts the analysis. Stay focused on economics. Ignore headlines about sports/culture/crime.
User: briefing summary + `Recent headlines:\n${titles.join('\n')}` → NewsCheckResult JSON

## UI
- "vs. News" button in BriefingCard header
- Loading spinner on click
- NewsCheckCard inline below bottom_line:
  - Header: "vs. Recent News · Last 7 days · GDELT"
  - Corroborations: green checkmark bullets
  - Contradictions: amber warning bullets
  - Overall: italic text
  - Collapsed article list (click to expand, shows titles + links)

## Files
| File | Action |
|------|--------|
| `types/index.ts` | Add `NewsArticle`, `NewsCheckResult` |
| `lib/prompts.ts` | Add `createNewsCheckPrompt(briefing, headlines)` |
| `app/api/news-check/route.ts` | New POST route |
| `app/components/NewsCheckCard.tsx` | New component |
| `app/components/BriefingCard.tsx` | Add button + news state + NewsCheckCard |
