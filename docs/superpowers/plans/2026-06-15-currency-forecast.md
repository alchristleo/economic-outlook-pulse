# Currency Forecast Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 12-month currency exchange rate forecast chart to the country briefing, showing historical actuals and a linear-regression-based projection with confidence intervals — displayed as two distinct lines (historical solid, forecast dashed).

**Architecture:** A new `POST /api/currency-forecast` endpoint fetches 36 months of monthly historical FX data from frankfurter.app (free, no key, ECB-sourced), runs OLS linear regression server-side, and returns historical + 12-month forecast + 95% CI bands. `page.tsx` fires this fetch in parallel with `generate-brief`. `BriefingCard` renders a new `CurrencyForecast` component (Recharts `ComposedChart`) beneath the Economic Radar.

**Tech Stack:** frankfurter.app (free historical FX API), Recharts `ComposedChart + Area + Line + ReferenceLine`, `date-fns` (month label formatting), TypeScript OLS regression (no external math lib), existing shadcn `Card + Badge`.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `types/index.ts` | Add `MonthlyRate`, `CurrencyForecastData` |
| Create | `lib/forex.ts` | frankfurter.app client + OLS regression + forecast |
| Create | `app/api/currency-forecast/route.ts` | POST endpoint, validates countryCode, returns forecast |
| Create | `app/components/CurrencyForecast.tsx` | Recharts chart: historical + forecast + CI band |
| Modify | `app/page.tsx` | Parallel-fetch forecast; store in state; pass to BriefingCard |
| Modify | `app/components/BriefingCard.tsx` | Accept optional `currencyForecast` prop; render section |
| Create | `__tests__/lib/forex.test.ts` | Unit tests: regression math + forecast shape |
| Create | `__tests__/components/CurrencyForecast.test.tsx` | Render tests |

---

## Task 1: Add Types

**Files:**
- Modify: `types/index.ts`

- [ ] **Step 1: Add interfaces after existing exports**

Open `types/index.ts` and append:

```ts
export interface MonthlyRate {
  month: string  // ISO "YYYY-MM"
  rate: number   // local currency units per 1 USD
}

export interface CurrencyForecastData {
  currencyCode: string
  historical: MonthlyRate[]
  forecast: MonthlyRate[]
  forecastCI: {
    upper: number[]  // parallel to forecast[]
    lower: number[]
  }
  regressionSlope: number  // LCU/month trend direction
  rSquared: number         // model fit quality 0–1
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /home/leo/AI_STUFF/the-pulse && npx tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add types/index.ts
git commit -m "feat(types): add MonthlyRate and CurrencyForecastData interfaces"
```

---

## Task 2: lib/forex.ts — Historical Fetch + OLS Forecast

**Files:**
- Create: `lib/forex.ts`
- Create: `__tests__/lib/forex.test.ts`

Frankfurter.app coverage note: ECB publishes rates for ~30 currencies. Covered by our `COUNTRIES` list: IDR, MYR, THB, PHP, SGD, INR, CNY, BRL, ZAR, TRY, MXN, GBP, EUR, JPY. Not covered: VND, NGN, KES, ARS, EGP, PKR, BDT. The route will return 422 when < 12 monthly data points are available.

- [ ] **Step 1: Write failing tests first**

Create `__tests__/lib/forex.test.ts`:

```ts
import {
  linearRegression,
  forecastPoints,
  sampleMonthlyRates,
} from '@/lib/forex'
import type { MonthlyRate } from '@/types'

describe('linearRegression', () => {
  it('returns exact slope and intercept for perfect linear data', () => {
    const points = [
      { x: 0, y: 10000 },
      { x: 1, y: 10100 },
      { x: 2, y: 10200 },
      { x: 3, y: 10300 },
    ]
    const reg = linearRegression(points)
    expect(reg.slope).toBeCloseTo(100, 2)
    expect(reg.intercept).toBeCloseTo(10000, 2)
    expect(reg.rSquared).toBeCloseTo(1, 4)
    expect(reg.residualStd).toBeCloseTo(0, 4)
  })

  it('computes rSquared < 1 for noisy data', () => {
    const points = [
      { x: 0, y: 10000 },
      { x: 1, y: 10500 },
      { x: 2, y: 9800 },
      { x: 3, y: 10300 },
    ]
    const reg = linearRegression(points)
    expect(reg.rSquared).toBeGreaterThan(0)
    expect(reg.rSquared).toBeLessThan(1)
  })
})

describe('forecastPoints', () => {
  it('returns the requested number of forecast steps', () => {
    const points = Array.from({ length: 24 }, (_, i) => ({ x: i, y: 15000 + i * 50 }))
    const reg = linearRegression(points)
    const result = forecastPoints(reg, 24, 12, points.length)
    expect(result).toHaveLength(12)
  })

  it('CI upper > predicted > CI lower', () => {
    const points = Array.from({ length: 24 }, (_, i) => ({
      x: i,
      y: 15000 + i * 50 + (Math.random() - 0.5) * 200,
    }))
    const reg = linearRegression(points)
    const result = forecastPoints(reg, 24, 12, points.length)
    result.forEach(({ value, upper, lower }) => {
      expect(upper).toBeGreaterThan(value)
      expect(lower).toBeLessThan(value)
    })
  })

  it('CI interval widens over forecast horizon', () => {
    const points = Array.from({ length: 36 }, (_, i) => ({
      x: i,
      y: 15000 + i * 30 + (Math.random() - 0.5) * 300,
    }))
    const reg = linearRegression(points)
    const result = forecastPoints(reg, 36, 12, points.length)
    const firstSpread = result[0].upper - result[0].lower
    const lastSpread = result[11].upper - result[11].lower
    expect(lastSpread).toBeGreaterThan(firstSpread)
  })
})

describe('sampleMonthlyRates', () => {
  it('returns one rate per month, first available', () => {
    const rates: Record<string, Record<string, number>> = {
      '2024-01-02': { IDR: 15500 },
      '2024-01-03': { IDR: 15600 },
      '2024-02-01': { IDR: 15700 },
    }
    const result = sampleMonthlyRates(rates, 'IDR')
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ month: '2024-01', rate: 15500 })
    expect(result[1]).toEqual({ month: '2024-02', rate: 15700 })
  })

  it('returns sorted by month ascending', () => {
    const rates: Record<string, Record<string, number>> = {
      '2024-03-01': { IDR: 15900 },
      '2024-01-01': { IDR: 15500 },
      '2024-02-01': { IDR: 15700 },
    }
    const result = sampleMonthlyRates(rates, 'IDR')
    expect(result.map(r => r.month)).toEqual(['2024-01', '2024-02', '2024-03'])
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /home/leo/AI_STUFF/the-pulse && npx jest __tests__/lib/forex.test.ts --no-coverage 2>&1
```

Expected: FAIL — `Cannot find module '@/lib/forex'`

- [ ] **Step 3: Implement lib/forex.ts**

Create `lib/forex.ts`:

```ts
import type { MonthlyRate, CurrencyForecastData } from '@/types'

const FRANKFURTER_BASE = 'https://api.frankfurter.app'

interface FrankfurterResponse {
  base: string
  rates: Record<string, Record<string, number>>
}

export function sampleMonthlyRates(
  rates: Record<string, Record<string, number>>,
  currencyCode: string
): MonthlyRate[] {
  const byMonth: Record<string, number> = {}
  for (const [dateStr, dayRates] of Object.entries(rates)) {
    const monthKey = dateStr.slice(0, 7)
    if (!(monthKey in byMonth) && dayRates[currencyCode] != null) {
      byMonth[monthKey] = dayRates[currencyCode]
    }
  }
  return Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, rate]) => ({ month, rate }))
}

export async function fetchHistoricalRates(
  currencyCode: string,
  monthsBack = 36
): Promise<MonthlyRate[]> {
  const end = new Date()
  const start = new Date(end)
  start.setMonth(start.getMonth() - monthsBack)

  const startStr = start.toISOString().slice(0, 10)
  const endStr = end.toISOString().slice(0, 10)

  const res = await fetch(
    `${FRANKFURTER_BASE}/${startStr}..${endStr}?from=USD&to=${currencyCode}`
  )
  if (!res.ok) throw new Error(`Frankfurter API ${res.status} for ${currencyCode}`)
  const json = (await res.json()) as FrankfurterResponse
  return sampleMonthlyRates(json.rates ?? {}, currencyCode)
}

export interface RegressionResult {
  slope: number
  intercept: number
  rSquared: number
  residualStd: number
  xMean: number
  xSumSqDev: number
  n: number
}

export function linearRegression(points: { x: number; y: number }[]): RegressionResult {
  const n = points.length
  const sumX = points.reduce((acc, p) => acc + p.x, 0)
  const sumY = points.reduce((acc, p) => acc + p.y, 0)
  const sumXY = points.reduce((acc, p) => acc + p.x * p.y, 0)
  const sumX2 = points.reduce((acc, p) => acc + p.x * p.x, 0)

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n
  const xMean = sumX / n

  const yMean = sumY / n
  const ssTot = points.reduce((acc, p) => acc + (p.y - yMean) ** 2, 0)
  const ssRes = points.reduce((acc, p) => acc + (p.y - (slope * p.x + intercept)) ** 2, 0)
  const rSquared = ssTot === 0 ? 1 : Math.max(0, 1 - ssRes / ssTot)
  const residualStd = n > 2 ? Math.sqrt(ssRes / (n - 2)) : 0
  const xSumSqDev = points.reduce((acc, p) => acc + (p.x - xMean) ** 2, 0)

  return { slope, intercept, rSquared, residualStd, xMean, xSumSqDev, n }
}

export function forecastPoints(
  reg: RegressionResult,
  startX: number,
  steps: number,
  n: number,
  zScore = 1.96
): Array<{ value: number; upper: number; lower: number }> {
  return Array.from({ length: steps }, (_, h) => {
    const x = startX + h
    const value = reg.slope * x + reg.intercept
    const se =
      reg.residualStd *
      Math.sqrt(1 + 1 / n + (x - reg.xMean) ** 2 / (reg.xSumSqDev || 1))
    const margin = zScore * se
    return { value, upper: value + margin, lower: value - margin }
  })
}

function addMonths(isoMonth: string, count: number): string {
  const [y, m] = isoMonth.split('-').map(Number)
  const d = new Date(y, m - 1 + count, 1)
  const yr = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  return `${yr}-${mo}`
}

export function computeCurrencyForecast(
  currencyCode: string,
  historical: MonthlyRate[],
  forecastMonths = 12
): CurrencyForecastData {
  const points = historical.map((r, i) => ({ x: i, y: r.rate }))
  const reg = linearRegression(points)

  const lastIndex = historical.length - 1
  const lastMonth = historical[lastIndex].month
  const projections = forecastPoints(reg, lastIndex + 1, forecastMonths, historical.length)

  const forecast: MonthlyRate[] = projections.map((p, i) => ({
    month: addMonths(lastMonth, i + 1),
    rate: Math.max(0, Math.round(p.value)),
  }))

  return {
    currencyCode,
    historical,
    forecast,
    forecastCI: {
      upper: projections.map(p => Math.max(0, Math.round(p.upper))),
      lower: projections.map(p => Math.max(0, Math.round(p.lower))),
    },
    regressionSlope: Math.round(reg.slope * 100) / 100,
    rSquared: Math.round(reg.rSquared * 1000) / 1000,
  }
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
cd /home/leo/AI_STUFF/the-pulse && npx jest __tests__/lib/forex.test.ts --no-coverage 2>&1
```

Expected: all 5 tests PASS.

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add lib/forex.ts __tests__/lib/forex.test.ts
git commit -m "feat(lib): add forex historical fetch and OLS currency forecast"
```

---

## Task 3: API Route — POST /api/currency-forecast

**Files:**
- Create: `app/api/currency-forecast/route.ts`

- [ ] **Step 1: Create route**

Create `app/api/currency-forecast/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { COUNTRIES, COUNTRY_CURRENCY } from '@/lib/worldbank'
import { fetchHistoricalRates, computeCurrencyForecast } from '@/lib/forex'
import type { CurrencyForecastData } from '@/types'

const MIN_MONTHS = 12

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { countryCode?: unknown }
    const countryCode = String(body.countryCode ?? '')

    const country = COUNTRIES.find((c) => c.code === countryCode)
    if (!country) {
      return NextResponse.json({ error: 'Invalid country code' }, { status: 400 })
    }

    const currencyCode = COUNTRY_CURRENCY[countryCode]
    if (!currencyCode || currencyCode === 'USD') {
      return NextResponse.json(
        { error: 'No foreign currency forecast for USD-denominated countries' },
        { status: 422 }
      )
    }

    let historical
    try {
      historical = await fetchHistoricalRates(currencyCode, 36)
    } catch {
      return NextResponse.json(
        { error: `Exchange rate data unavailable for ${currencyCode}` },
        { status: 422 }
      )
    }

    if (historical.length < MIN_MONTHS) {
      return NextResponse.json(
        { error: `Insufficient history for ${currencyCode} (need ≥${MIN_MONTHS} months)` },
        { status: 422 }
      )
    }

    const forecast: CurrencyForecastData = computeCurrencyForecast(
      currencyCode,
      historical,
      12
    )

    return NextResponse.json({ forecast })
  } catch (err) {
    console.error('[currency-forecast]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 3: Quick manual smoke test (dev server must be running)**

```bash
curl -s -X POST http://localhost:3000/api/currency-forecast \
  -H "Content-Type: application/json" \
  -d '{"countryCode":"ID"}' | python3 -m json.tool | head -30
```

Expected: JSON with `forecast.currencyCode = "IDR"`, `forecast.historical` array of 30+ items, `forecast.forecast` array of 12 items.

- [ ] **Step 4: Test rejection cases**

```bash
# Invalid country
curl -s -X POST http://localhost:3000/api/currency-forecast \
  -H "Content-Type: application/json" \
  -d '{"countryCode":"XX"}' | python3 -m json.tool

# USD country
curl -s -X POST http://localhost:3000/api/currency-forecast \
  -H "Content-Type: application/json" \
  -d '{"countryCode":"US"}' | python3 -m json.tool
```

Expected: `{"error":"Invalid country code"}` (400) and `{"error":"No foreign currency..."}` (422).

- [ ] **Step 5: Commit**

```bash
git add app/api/currency-forecast/route.ts
git commit -m "feat(api): add currency-forecast endpoint with frankfurter.app + OLS projection"
```

---

## Task 4: CurrencyForecast Component

**Files:**
- Create: `app/components/CurrencyForecast.tsx`
- Create: `__tests__/components/CurrencyForecast.test.tsx`

Chart design:
- `ComposedChart` (Recharts)
- Two visible lines: **Historical** (solid `#E3120B`) and **12-month Forecast** (dashed `#1A1A1A`)
- CI band rendered as two stacked `Area` series (ciTop filled red-10%, ciBottom filled white to mask bottom — standard Recharts CI band pattern)
- `ReferenceLine` at the boundary between historical and forecast
- Y-axis: full LCU numbers (e.g. 15,000–16,500 for IDR), formatted with locale separator
- X-axis: month labels like "Jan '24", shown every 6 months to avoid crowding
- Tooltip shows all three values (historical/forecast/CI bounds)

- [ ] **Step 1: Write failing component test**

Create `__tests__/components/CurrencyForecast.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import CurrencyForecast from '@/app/components/CurrencyForecast'
import type { CurrencyForecastData } from '@/types'

// Recharts uses ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

const historical = Array.from({ length: 24 }, (_, i) => ({
  month: `2024-${String(i % 12 + 1).padStart(2, '0')}`,
  rate: 15000 + i * 50,
}))

const mockForecast: CurrencyForecastData = {
  currencyCode: 'IDR',
  historical,
  forecast: Array.from({ length: 12 }, (_, i) => ({
    month: `2025-${String(i + 1).padStart(2, '0')}`,
    rate: 16200 + i * 30,
  })),
  forecastCI: {
    upper: Array.from({ length: 12 }, (_, i) => 16500 + i * 30),
    lower: Array.from({ length: 12 }, (_, i) => 15900 + i * 30),
  },
  regressionSlope: 50,
  rSquared: 0.92,
}

describe('CurrencyForecast', () => {
  it('renders section heading', () => {
    render(<CurrencyForecast data={mockForecast} />)
    expect(screen.getByText(/IDR\/USD/i)).toBeInTheDocument()
  })

  it('renders R² quality badge', () => {
    render(<CurrencyForecast data={mockForecast} />)
    expect(screen.getByText(/R²/)).toBeInTheDocument()
    expect(screen.getByText(/0\.920/)).toBeInTheDocument()
  })

  it('renders trend direction text', () => {
    render(<CurrencyForecast data={mockForecast} />)
    // slope 50 = depreciation (more IDR per USD over time)
    expect(screen.getByText(/depreciat/i)).toBeInTheDocument()
  })

  it('renders disclaimer note', () => {
    render(<CurrencyForecast data={mockForecast} />)
    expect(screen.getByText(/linear trend model/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to confirm fail**

```bash
npx jest __tests__/components/CurrencyForecast.test.tsx --no-coverage 2>&1
```

Expected: FAIL — `Cannot find module '@/app/components/CurrencyForecast'`

- [ ] **Step 3: Implement CurrencyForecast.tsx**

Create `app/components/CurrencyForecast.tsx`:

```tsx
'use client'

import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import type { CurrencyForecastData } from '@/types'

interface Props {
  data: CurrencyForecastData
}

interface ChartPoint {
  monthKey: string
  label: string
  historical?: number
  forecast?: number
  ciTop?: number
  ciBottom?: number
  isBoundary: boolean
}

function buildChartData(data: CurrencyForecastData): { points: ChartPoint[]; boundaryLabel: string } {
  const histPoints: ChartPoint[] = data.historical.map((r, i) => ({
    monthKey: r.month,
    label: format(parseISO(r.month + '-01'), "MMM ''yy"),
    historical: r.rate,
    isBoundary: i === data.historical.length - 1,
  }))

  const lastHist = data.historical[data.historical.length - 1]
  const boundaryLabel = format(parseISO(lastHist.month + '-01'), "MMM ''yy")

  // Bridge: last historical point also anchors forecast line
  histPoints[histPoints.length - 1].forecast = lastHist.rate
  histPoints[histPoints.length - 1].ciTop = lastHist.rate
  histPoints[histPoints.length - 1].ciBottom = lastHist.rate

  const forecastPoints: ChartPoint[] = data.forecast.map((r, i) => ({
    monthKey: r.month,
    label: format(parseISO(r.month + '-01'), "MMM ''yy"),
    forecast: r.rate,
    ciTop: data.forecastCI.upper[i],
    ciBottom: data.forecastCI.lower[i],
    isBoundary: false,
  }))

  return { points: [...histPoints, ...forecastPoints], boundaryLabel }
}

function formatRate(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 })
}

// Recharts tick interval: show every 6th x-axis label
function xTickFormatter(_: string, index: number) {
  return index % 6 === 0 ? _ : ''
}

export default function CurrencyForecast({ data }: Props) {
  const { points, boundaryLabel } = buildChartData(data)
  const { currencyCode, regressionSlope, rSquared } = data

  const trendLabel =
    regressionSlope > 0
      ? `Depreciating (${currencyCode} weakening vs USD)`
      : regressionSlope < 0
      ? `Appreciating (${currencyCode} strengthening vs USD)`
      : 'Flat trend'

  const r2Color = rSquared >= 0.7 ? 'text-green-700' : rSquared >= 0.4 ? 'text-amber-700' : 'text-red-700'

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          {currencyCode}/USD — 12-Month Forecast
        </h3>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`text-xs ${r2Color}`}>
            R² {rSquared.toFixed(3)}
          </Badge>
          <span className="text-xs text-gray-400">{trendLabel}</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={points} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="label"
            tickFormatter={xTickFormatter}
            tick={{ fontSize: 10, fill: '#6b7280' }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatRate}
            tick={{ fontSize: 10, fill: '#6b7280' }}
            tickLine={false}
            axisLine={false}
            width={60}
          />
          <Tooltip
            formatter={(value: number, name: string) => [formatRate(value), name]}
            labelFormatter={(label) => label}
            contentStyle={{ fontSize: 11, borderRadius: 4 }}
          />
          <Legend
            iconType="line"
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          />
          <ReferenceLine
            x={boundaryLabel}
            stroke="#9ca3af"
            strokeDasharray="4 2"
            label={{ value: 'Today', position: 'insideTopRight', fontSize: 10, fill: '#9ca3af' }}
          />
          {/* CI band: ciTop filled red, ciBottom white — standard Recharts CI pattern */}
          <Area
            type="monotone"
            dataKey="ciTop"
            fill="#E3120B"
            fillOpacity={0.10}
            stroke="none"
            legendType="none"
            name=""
            connectNulls={false}
          />
          <Area
            type="monotone"
            dataKey="ciBottom"
            fill="white"
            fillOpacity={1}
            stroke="none"
            legendType="none"
            name=""
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="historical"
            name="Historical"
            stroke="#E3120B"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="forecast"
            name="Forecast (95% CI)"
            stroke="#1A1A1A"
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={false}
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <p className="text-right text-xs text-gray-400">
        Linear trend model · ECB/Frankfurter data · Not investment advice
      </p>
    </div>
  )
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npx jest __tests__/components/CurrencyForecast.test.tsx --no-coverage 2>&1
```

Expected: all 4 tests PASS.

- [ ] **Step 5: Run full test suite to check no regressions**

```bash
npx jest --no-coverage 2>&1
```

Expected: all existing tests still pass.

- [ ] **Step 6: Commit**

```bash
git add app/components/CurrencyForecast.tsx __tests__/components/CurrencyForecast.test.tsx
git commit -m "feat(component): add CurrencyForecast chart with historical + OLS forecast + CI band"
```

---

## Task 5: Wire page.tsx — Parallel Fetch

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Read current page.tsx**

Current state: `handleGenerate` fires `POST /api/generate-brief` only. We need to also fire `POST /api/currency-forecast` in parallel, store result in state, and pass to `BriefingCard`.

- [ ] **Step 2: Apply changes**

In `app/page.tsx`, apply these modifications:

**Add import at top (after existing imports):**
```ts
import type { Briefing, Country, WorldBankIndicator, CurrencyForecastData } from '@/types'
```
(replace the existing type import line which currently lacks `CurrencyForecastData`)

**Add state after the `indicators` state line:**
```ts
const [currencyForecast, setCurrencyForecast] = useState<CurrencyForecastData | null>(null)
```

**Replace the `handleGenerate` function body** with:
```ts
async function handleGenerate() {
  if (!selectedCountry) return
  setAppState('loading')
  setBriefing(null)
  setCurrencyForecast(null)

  try {
    const [briefRes, forecastRes] = await Promise.all([
      fetch('/api/generate-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countryCode: selectedCountry.code }),
      }),
      fetch('/api/currency-forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countryCode: selectedCountry.code }),
      }),
    ])

    if (!briefRes.ok) throw new Error('Failed to generate briefing')

    const data = (await briefRes.json()) as { briefing: Briefing; indicators: WorldBankIndicator[] }
    setBriefing(data.briefing)
    setIndicators(data.indicators)

    if (forecastRes.ok) {
      const fData = (await forecastRes.json()) as { forecast: CurrencyForecastData }
      setCurrencyForecast(fData.forecast)
    }
    // forecast failure is non-fatal — BriefingCard handles null gracefully

    setAppState('ready')
  } catch {
    toast.error('Failed to generate briefing. Please try again.')
    setAppState('idle')
  }
}
```

**Update BriefingCard render line** (inside `appState === 'ready'` block):
```tsx
<BriefingCard briefing={briefing} currencyForecast={currencyForecast} />
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1
```

Expected: error about `currencyForecast` prop not existing on BriefingCard (this is expected — fixed in Task 6).

- [ ] **Step 4: Commit after Task 6 resolves the TS error (do not commit yet)**

---

## Task 6: Update BriefingCard to Render CurrencyForecast

**Files:**
- Modify: `app/components/BriefingCard.tsx`

- [ ] **Step 1: Read current BriefingCard.tsx**

Currently: imports `EconomicRadar`, accepts only `{ briefing: Briefing }`, renders radar above Separator.

- [ ] **Step 2: Apply changes**

**Add import at top:**
```ts
import CurrencyForecast from './CurrencyForecast'
import type { CurrencyForecastData } from '@/types'
```

**Update props interface:**
```ts
interface BriefingCardProps {
  briefing: Briefing
  currencyForecast?: CurrencyForecastData | null
}
```

**Update function signature:**
```ts
export default function BriefingCard({ briefing, currencyForecast }: BriefingCardProps) {
```

**Add CurrencyForecast section** after the EconomicRadar and its Separator, before the risks/opportunities grid. Insert after `<Separator />` (first one):

```tsx
{currencyForecast && (
  <>
    <CurrencyForecast data={currencyForecast} />
    <Separator />
  </>
)}
```

The final `CardContent` structure should be:
1. EconomicRadar
2. `<Separator />`
3. `{currencyForecast && <><CurrencyForecast .../><Separator /></>}`
4. Risks / Opportunities / What to Watch grid
5. `<Separator />`
6. Bottom line block
7. Generated timestamp

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 4: Run full test suite**

```bash
npx jest --no-coverage 2>&1
```

Expected: all tests pass. BriefingCard tests don't pass `currencyForecast` prop — that's fine, it's optional and component renders correctly without it.

- [ ] **Step 5: Commit Tasks 5+6 together**

```bash
git add app/page.tsx app/components/BriefingCard.tsx
git commit -m "feat: wire currency forecast into briefing page and card"
```

---

## Task 7: Visual Verification

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test Indonesia (IDR — ECB-covered)**

1. Select Indonesia → Generate Brief
2. Verify briefing loads normally
3. Verify CurrencyForecast chart appears below EconomicRadar
4. Chart should show ~30+ months of solid red historical line, then 12-month dashed forecast
5. CI shading visible in forecast zone
6. R² badge shown, trend direction text correct (IDR generally depreciating)
7. "Today" reference line visible at boundary

- [ ] **Step 3: Test United States (USD — no forecast expected)**

Select United States → Generate Brief. Verify CurrencyForecast section absent (USD is base currency, API returns 422, page.tsx handles silently).

- [ ] **Step 4: Test a non-ECB currency (Vietnam — VND)**

Select Vietnam → Generate Brief. Verify CurrencyForecast section absent (VND not in ECB rates, API returns 422, page.tsx handles silently). Briefing still loads.

- [ ] **Step 5: Final commit if any visual fixes needed**

```bash
git add -p
git commit -m "fix(currency-forecast): visual polish from manual verification"
```

---

## Self-Review Checklist

### Spec Coverage

| Requirement | Task |
|-------------|------|
| 12-month forecast chart | Task 4 |
| Retain actual LCU numbers (not index) | Task 2 `computeCurrencyForecast` rounds to int; Task 4 YAxis `formatRate` shows locale-formatted full numbers |
| 2 lines: historical + forecast | Task 4: Line `historical` (solid red) + Line `forecast` (dashed black) |
| Chart embedded in country summary | Task 6: BriefingCard |
| Graceful fallback for unsupported currencies | Task 3: API returns 422; Task 5: page.tsx ignores forecast failure |
| Confidence intervals | Task 2 `forecastPoints`, Task 4 Area CI band |
| TDD | Tests written before implementation in Tasks 2 and 4 |
| No new mandatory dependencies | frankfurter.app is free fetch, no npm package needed |

### Type Consistency

- `MonthlyRate.month` is `"YYYY-MM"` consistently: `sampleMonthlyRates`, `addMonths`, `buildChartData` all append `-01` before `parseISO`.
- `CurrencyForecastData.forecastCI.upper[i]` is parallel to `forecast[i]` — maintained in `computeCurrencyForecast` and consumed correctly in `buildChartData`.
- `ChartPoint.ciTop / ciBottom` optional (undefined for historical points) — `connectNulls={false}` ensures Areas don't span back into historical zone.
- `currencyForecast` prop on `BriefingCard` is `CurrencyForecastData | null | undefined` — all three states handled (`currencyForecast &&` guard).
