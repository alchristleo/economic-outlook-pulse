'use client'

import { useRef, useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Loader2, AlertTriangle, TrendingUp, Eye } from 'lucide-react'
import EconomicRadar from './EconomicRadar'
import CurrencyForecast from './CurrencyForecast'
import DebateCard from './DebateCard'
import LensCard from './LensCard'
import NewsCheckCard from './NewsCheckCard'
import ScenarioInput from './ScenarioInput'
import ScenarioCard from './ScenarioCard'
import type { Briefing, CurrencyForecastData, DebateResult, LensResult, LensType, NewsArticle, NewsCheckResult, ScenarioResult } from '@/types'
import { format } from 'date-fns'

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
  const [debate, setDebate] = useState<DebateResult | null>(null)
  const [debateLoading, setDebateLoading] = useState(false)

  const [activeLens, setActiveLens] = useState<LensType | 'standard'>('standard')
  const [lensLoading, setLensLoading] = useState(false)
  const [currentLensResult, setCurrentLensResult] = useState<LensResult | undefined>(undefined)
  const lensCache = useRef<Map<string, LensResult>>(new Map())

  const [newsResult, setNewsResult] = useState<NewsCheckResult | null>(null)
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([])
  const [newsLoading, setNewsLoading] = useState(false)
  const [newsError, setNewsError] = useState<string | null>(null)

  const [showScenario, setShowScenario] = useState(false)
  const [scenario, setScenario] = useState<ScenarioResult | null>(null)
  const [scenarioHypothesis, setScenarioHypothesis] = useState('')
  const [scenarioLoading, setScenarioLoading] = useState(false)

  async function handleDebate() {
    if (debateLoading) return
    setDebateLoading(true)
    setDebate(null)
    try {
      const res = await fetch('/api/debate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countryCode: briefing.country_code, briefing }),
      })
      if (!res.ok) throw new Error('Debate failed')
      const data = (await res.json()) as { debate: DebateResult }
      setDebate(data.debate)
    } catch {
      console.error('Debate failed')
    } finally {
      setDebateLoading(false)
    }
  }

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

  async function handleScenario(hypothesis: string) {
    setScenarioLoading(true)
    setScenario(null)
    setScenarioHypothesis(hypothesis)
    try {
      const res = await fetch('/api/scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countryCode: briefing.country_code, hypothesis, briefing }),
      })
      if (!res.ok) throw new Error('Scenario failed')
      const data = (await res.json()) as { scenario: ScenarioResult }
      setScenario(data.scenario)
    } catch {
      console.error('Scenario failed')
    } finally {
      setScenarioLoading(false)
    }
  }

  async function handleNewsCheck() {
    if (newsLoading) return
    setNewsLoading(true)
    setNewsResult(null)
    setNewsArticles([])
    setNewsError(null)
    try {
      const res = await fetch('/api/news-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countryCode: briefing.country_code, briefing }),
      })
      if (!res.ok) {
        const err = (await res.json()) as { error: string }
        setNewsError(err.error ?? 'News check failed')
        return
      }
      const data = (await res.json()) as { result: NewsCheckResult; articles: NewsArticle[] }
      setNewsResult(data.result)
      setNewsArticles(data.articles)
    } catch {
      setNewsError('News check failed')
    } finally {
      setNewsLoading(false)
    }
  }


  return (
    <Card className="overflow-hidden border-0 shadow-lg">
      <div className="h-1 w-full bg-[#E3120B]" />
      <CardHeader className="space-y-3 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#E3120B]">
              The Pulse — Economic Briefing
            </p>
            <h1 className="mt-1 text-2xl font-bold leading-tight text-[#1A1A1A]">
              {briefing.title}
            </h1>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <Badge className="border-amber-200 bg-amber-50 text-amber-700 text-xs font-medium">
              Prototype
            </Badge>
            {briefing.data_year && (
              <Badge variant="outline" className="text-xs text-gray-500">
                IMF WEO · {briefing.data_year}
              </Badge>
            )}
            {briefing.exchange_rate && (
              <Badge variant="outline" className="text-xs text-gray-500">
                {briefing.exchange_rate.currency}/USD · {briefing.exchange_rate.rate.toLocaleString()}
              </Badge>
            )}
            <div className="flex flex-wrap gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setShowScenario((v) => !v); setScenario(null) }}
                className={`h-7 text-xs border-gray-200 hover:border-amber-500 hover:text-amber-600 ${showScenario ? 'border-amber-400 text-amber-600 bg-amber-50' : 'text-gray-600'}`}
              >
                ⚡ What If?
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDebate}
                disabled={debateLoading}
                className="h-7 text-xs border-gray-200 text-gray-600 hover:border-[#E3120B] hover:text-[#E3120B]"
              >
                {debateLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : '⚔ Bull vs Bear'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNewsCheck}
                disabled={newsLoading}
                className="h-7 text-xs border-gray-200 text-gray-600 hover:border-blue-500 hover:text-blue-600"
              >
                {newsLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : '📰 vs. News'}
              </Button>
            </div>
          </div>
        </div>

        {/* Investor Lens segmented control */}
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
          {LENS_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleLensChange(tab.id)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                activeLens === tab.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <p className="text-base leading-relaxed text-gray-700">{briefing.executive_summary}</p>

        {/* Lens result below executive summary */}
        {activeLens !== 'standard' && (
          <div>
            {lensLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Analysing through {LENS_TABS.find((t) => t.id === activeLens)?.label} lens…
              </div>
            ) : currentLensResult ? (
              <LensCard result={currentLensResult} />
            ) : null}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Primary: Economic Health Radar */}
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

        {showScenario && (
          <div className="space-y-3">
            <ScenarioInput onRun={handleScenario} isLoading={scenarioLoading} />
            {scenario && <ScenarioCard scenario={scenario} hypothesis={scenarioHypothesis} />}
          </div>
        )}

        {debate && <DebateCard debate={debate} />}

        {newsError && (
          <p className="text-xs text-amber-600 bg-amber-50 rounded px-3 py-2">{newsError}</p>
        )}
        {newsResult && <NewsCheckCard result={newsResult} articles={newsArticles} />}

        <p className="text-right text-xs text-gray-400">
          Generated {format(new Date(briefing.generated_at), 'PPP p')}
        </p>
      </CardContent>
    </Card>
  )
}
