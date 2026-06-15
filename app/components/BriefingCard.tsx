'use client'

import { useRef, useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Loader2, AlertTriangle, TrendingUp, Eye, BarChart2, ArrowLeftRight } from 'lucide-react'
import EconomicRadar from './EconomicRadar'
import CurrencyForecast from './CurrencyForecast'
import LensCard from './LensCard'
import type { Briefing, CurrencyForecastData, LensResult, LensType, ConfidenceLevel } from '@/types'
import { format } from 'date-fns'

const CONFIDENCE_CONFIG: Record<ConfidenceLevel, { label: string; className: string }> = {
  high: {
    label: 'High confidence',
    className: 'border-green-200 bg-green-50 text-green-700',
  },
  medium: {
    label: 'Medium confidence',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  low: {
    label: 'Low confidence',
    className: 'border-red-200 bg-red-50 text-red-700',
  },
}

interface BriefingCardProps {
  briefing: Briefing
  currencyForecast?: CurrencyForecastData | null
}

const LENS_TABS: { id: LensType | 'standard'; label: string }[] = [
  { id: 'standard', label: 'Standard' },
  { id: 'bond', label: 'Bond' },
  { id: 'equity', label: 'Equity' },
  { id: 'central_bank', label: 'Central Bank' },
]

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

export default function BriefingCard({ briefing, currencyForecast }: BriefingCardProps) {
  const [activeLens, setActiveLens] = useState<LensType | 'standard'>('standard')
  const [lensLoading, setLensLoading] = useState(false)
  const [currentLensResult, setCurrentLensResult] = useState<LensResult | undefined>(undefined)
  const lensCache = useRef<Map<string, LensResult>>(new Map())

  async function handleLensChange(lens: LensType | 'standard') {
    setActiveLens(lens)
    if (lens === 'standard') {
      setCurrentLensResult(undefined)
      return
    }

    const cacheKey = `${briefing.country_code}:${lens}`
    const cached = lensCache.current.get(cacheKey)
    if (cached) {
      setCurrentLensResult(cached)
      return
    }

    setCurrentLensResult(undefined)
    setLensLoading(true)
    try {
      const res = await fetch('/api/lens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countryCode: briefing.country_code, lens, briefing }),
      })
      if (!res.ok) throw new Error('Lens failed')
      const data = (await res.json()) as { result: LensResult }
      lensCache.current.set(cacheKey, data.result)
      setCurrentLensResult(data.result)
    } catch {
      console.error('Lens failed')
    } finally {
      setLensLoading(false)
    }
  }

  return (
    <Card className="overflow-hidden border-0 shadow-lg">
      <div className="h-1 w-full bg-[#E3120B]" />
      <CardHeader className="space-y-4 pb-4">
        {/* Title */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#E3120B]">
            The Pulse — Economic Briefing
          </p>
          <h1 className="mt-1 text-2xl font-bold leading-tight text-[#1A1A1A]">
            {briefing.title}
          </h1>
        </div>

        {/* Badges — horizontal row */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
            <AlertTriangle className="h-3 w-3" />
            Prototype
          </span>
          {briefing.data_year && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
              <BarChart2 className="h-3 w-3" />
              IMF WEO · {briefing.data_year}
            </span>
          )}
          {briefing.exchange_rate && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
              <ArrowLeftRight className="h-3 w-3" />
              {briefing.exchange_rate.currency}/USD · {briefing.exchange_rate.rate.toLocaleString()}
            </span>
          )}
        </div>

        {/* Investor Lens segmented control — full width */}
        <div className="flex gap-0.5 rounded-lg border border-gray-200 bg-gray-100 p-1 shadow-inner">
          {LENS_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleLensChange(tab.id)}
              className={`flex-1 cursor-pointer rounded-md py-1.5 text-xs font-medium transition-all select-none ${
                activeLens === tab.id
                  ? 'bg-white text-[#1A1A1A] shadow-sm ring-1 ring-gray-200'
                  : 'text-gray-500 hover:bg-white/60 hover:text-gray-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <p className="text-base leading-relaxed text-gray-700">{briefing.executive_summary}</p>

        {/* Lens result */}
        {activeLens !== 'standard' && (
          <div>
            {lensLoading ? (
              <div className="rounded-md border border-gray-200 bg-gray-50 p-4 space-y-3 animate-pulse">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  <span className="text-sm font-medium text-gray-500">
                    Analysing through {LENS_TABS.find((t) => t.id === activeLens)?.label} lens…
                  </span>
                </div>
                <div className="h-3 bg-gray-200 rounded w-3/4" />
                <div className="space-y-2">
                  <div className="h-2.5 bg-gray-200 rounded w-full" />
                  <div className="h-2.5 bg-gray-200 rounded w-5/6" />
                  <div className="h-2.5 bg-gray-200 rounded w-4/6" />
                </div>
                <div className="h-8 bg-red-100 rounded w-2/3" />
              </div>
            ) : currentLensResult ? (
              <LensCard result={currentLensResult} />
            ) : null}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        <EconomicRadar healthScore={briefing.health_score} />

        <Separator />

        {currencyForecast && (
          <>
            <CurrencyForecast data={currencyForecast} />
            <Separator />
          </>
        )}

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
