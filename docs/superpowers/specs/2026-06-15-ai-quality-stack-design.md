# AI Quality Stack — Design Spec

**Date:** 2026-06-15  
**Feature:** Tier 1 AI Quality Improvements  
**Status:** Approved

---

## Goal

Upgrade The Pulse's LLM pipeline with four complementary techniques that materially improve briefing quality and epistemic honesty — no new infrastructure, ~1 day of work.

## Architecture

Single-pipeline enhancement to `generate-brief`. Current flow (one Claude call → JSON) becomes a three-pass flow: generate → critique → revise. Extended thinking and prompt caching apply to the first pass. Confidence scoring is a schema extension.

```
Client → POST /api/generate-brief
           ├─ fetch IMF + WB data (parallel, unchanged)
           ├─ Pass 1: claude-opus-4-8 + thinking → draft briefing JSON
           ├─ Pass 2: critic prompt → 3 weaknesses list
           ├─ Pass 3: revision prompt + critique → final briefing JSON
           └─ return { briefing, currencyForecast? }
```

Total added latency: ~3–5s. Acceptable for a research-grade briefing product.

---

## Techniques

### 1. Extended Thinking

**What:** Enable `thinking` on `claude-opus-4-8` for Pass 1 (draft generation).

**Why:** Briefing synthesis is complex — 8+ indicators, risk/opportunity balancing, Economist tone. Thinking lets the model reason internally before committing to JSON output. Visible in token usage, invisible in UI.

**Config:**
```ts
model: 'claude-opus-4-8',
thinking: { type: 'enabled', budget_tokens: 8000 },
max_tokens: 10000,  // must be > budget_tokens
```

**Constraint:** Extended thinking requires `temperature: 1` (default). Do not set custom temperature.

**Scope:** Pass 1 only. Critic (Pass 2) and revision (Pass 3) use `claude-sonnet-4-6` — no thinking needed for those roles.

---

### 2. Prompt Caching

**What:** Mark static system prompt content with `cache_control: { type: 'ephemeral' }`.

**Why:** The voice/style instructions and injection-guard rules in the system prompt are identical across every request. Caching them eliminates re-processing on repeat generates (~80% cost reduction on cached tokens, ~60% latency reduction on cache hits).

**Boundary:** Cache only the static prefix (voice rules, injection guards, output schema). The dynamic suffix (country data, indicator values) must remain uncached — it changes per request.

**Implementation:**
```ts
messages: [
  {
    role: 'user',
    content: [
      { type: 'text', text: STATIC_SYSTEM_CONTENT, cache_control: { type: 'ephemeral' } },
      { type: 'text', text: dynamicCountryData },  // no cache_control
    ]
  }
]
```

Note: Cache TTL is 5 minutes (Anthropic ephemeral). Warm on repeated demo usage; cold on first call.

---

### 3. Self-Critique Loop

**What:** Two additional Claude calls after Pass 1 — a critic and a reviser.

**Why:** Single-pass generation produces good-but-not-great output. The critic surfaces blind spots the initial pass missed (unsupported claims, missed risks, tone lapses). The reviser fixes them. Constitutional AI pattern.

**Pass 2 — Critic (`claude-sonnet-4-6`, no thinking):**
```
System: You are a rigorous economics editor. Identify exactly 3 weaknesses 
in this briefing. Focus on: unsupported claims, missing downside risks, 
Economist tone lapses, or outdated framing. Be specific and brief.

User: <draft briefing JSON>

Response format: ["weakness 1", "weakness 2", "weakness 3"]
```

**Pass 3 — Reviser (`claude-sonnet-4-6`, no thinking):**
```
System: Revise this economic briefing to address the critique. 
Maintain The Economist's voice. Return valid JSON matching the original schema.

User: Draft: <draft JSON>\n\nCritique: <critique array>
```

**UI feedback:** Loading state shows three steps:
1. "Fetching economic data…"
2. "Generating analysis…"  
3. "Refining analysis…"

---

### 4. Structured Confidence

**What:** Add `confidence` and `data_quality_note` fields to `Briefing` type and JSON schema.

**Why:** Epistemic honesty is core Economist brand. Some countries have excellent data (US, Germany); others lag badly (Nigeria, Bangladesh). Surfacing this in the UI builds trust.

**Schema addition:**
```ts
interface Briefing {
  // ... existing fields ...
  confidence: 'high' | 'medium' | 'low'
  data_quality_note?: string  // e.g. "GDP data lags 18 months"
}
```

**Model instructions (in system prompt):**
```
Set confidence to:
- "high": multiple fresh indicators (≤2yr lag), consistent signals
- "medium": some indicators missing or >2yr old, mixed signals  
- "low": significant data gaps, >3yr lag, contradictory signals

data_quality_note: one sentence if confidence is medium/low, omit if high.
```

**UI:** Badge next to "Grounded in latest public data" — green (high), amber (medium), red (low) + tooltip with note.

---

## Files Changed

| File | Change |
|------|--------|
| `app/api/generate-brief/route.ts` | Three-pass generation, thinking param, caching |
| `lib/prompts.ts` | Add `createCriticPrompt()`, `createRevisionPrompt()`, split static/dynamic system prompt |
| `lib/anthropic.ts` | Add `cache_control` helper, export model constants |
| `types/index.ts` | Add `confidence`, `data_quality_note` to `Briefing` |
| `app/page.tsx` | Three-step loading state labels |
| `app/components/BriefingCard.tsx` | Confidence badge with color + tooltip |
| `__tests__/` | Tests for critic/revision prompts, confidence badge rendering |

---

## Non-Goals

- No new data sources (out of scope for this ticket)
- No streaming of intermediate passes to client (complexity not worth it for MVP)
- No storing/surfacing the critique text in the UI (internal quality mechanism only)
- No fine-tuning (separate initiative)

---

## Success Criteria

1. `generate-brief` returns briefing with `confidence` field on every call
2. Repeated generate for same country hits prompt cache (verify via Anthropic usage headers)
3. Output quality measurably better — at minimum, risks section catches edge cases the old single-pass missed
4. Loading state shows 3 distinct steps
5. Confidence badge visible in BriefingCard, color-coded
6. All existing tests pass; new tests for added behaviour
