'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Newspaper, Zap, Swords, Newspaper as News } from 'lucide-react'
import CountrySelector from './components/CountrySelector'
import BriefingCard from './components/BriefingCard'
import ChatInterface from './components/ChatInterface'
import ScenarioInput from './components/ScenarioInput'
import ScenarioCard from './components/ScenarioCard'
import DebateCard from './components/DebateCard'
import NewsCheckCard from './components/NewsCheckCard'
import { Button } from '@/components/ui/button'
import { COUNTRIES } from '@/lib/worldbank'
import type {
  Briefing,
  Country,
  WorldBankIndicator,
  CurrencyForecastData,
  ScenarioResult,
  DebateResult,
  NewsArticle,
  NewsCheckResult,
} from '@/types'

type AppState = 'idle' | 'loading' | 'ready'
type ActiveTool = 'none' | 'scenario' | 'debate' | 'news'

export default function HomePage() {
  const [appState, setAppState] = useState<AppState>('idle')
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null)
  const [briefing, setBriefing] = useState<Briefing | null>(null)
  const [indicators, setIndicators] = useState<WorldBankIndicator[]>([])
  const [currencyForecast, setCurrencyForecast] = useState<CurrencyForecastData | null>(null)

  const [activeTool, setActiveTool] = useState<ActiveTool>('none')
  const [scenario, setScenario] = useState<ScenarioResult | null>(null)
  const [scenarioHypothesis, setScenarioHypothesis] = useState('')
  const [scenarioLoading, setScenarioLoading] = useState(false)
  const [debate, setDebate] = useState<DebateResult | null>(null)
  const [debateLoading, setDebateLoading] = useState(false)
  const [newsResult, setNewsResult] = useState<NewsCheckResult | null>(null)
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([])
  const [newsLoading, setNewsLoading] = useState(false)
  const [newsError, setNewsError] = useState<string | null>(null)

  function toggleTool(tool: ActiveTool) {
    setActiveTool((prev) => (prev === tool ? 'none' : tool))
  }

  async function handleScenario(hypothesis: string) {
    if (!briefing || !selectedCountry) return
    setScenarioLoading(true)
    setScenario(null)
    setScenarioHypothesis(hypothesis)
    try {
      const res = await fetch('/api/scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countryCode: selectedCountry.code, hypothesis, briefing }),
      })
      if (!res.ok) throw new Error('Scenario failed')
      const data = (await res.json()) as { scenario: ScenarioResult }
      setScenario(data.scenario)
    } catch {
      toast.error('Scenario failed. Please try again.')
    } finally {
      setScenarioLoading(false)
    }
  }

  async function handleDebate() {
    if (!briefing || !selectedCountry || debateLoading) return
    setDebateLoading(true)
    setDebate(null)
    try {
      const res = await fetch('/api/debate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countryCode: selectedCountry.code, briefing }),
      })
      if (!res.ok) throw new Error('Debate failed')
      const data = (await res.json()) as { debate: DebateResult }
      setDebate(data.debate)
    } catch {
      toast.error('Debate failed. Please try again.')
    } finally {
      setDebateLoading(false)
    }
  }

  async function handleNewsCheck() {
    if (!briefing || !selectedCountry || newsLoading) return
    setNewsLoading(true)
    setNewsResult(null)
    setNewsArticles([])
    setNewsError(null)
    try {
      const res = await fetch('/api/news-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countryCode: selectedCountry.code, briefing }),
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

  async function handleGenerate() {
    if (!selectedCountry) return
    setActiveTool('none')
    setScenario(null)
    setScenarioHypothesis('')
    setDebate(null)
    setNewsResult(null)
    setNewsArticles([])
    setNewsError(null)
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

      setAppState('ready')
    } catch {
      toast.error('Failed to generate briefing. Please try again.')
      setAppState('idle')
    }
  }

  const hasResult = scenario || debate || newsResult || newsError

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b-2 border-[#E3120B] bg-[#1A1A1A] text-white">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-[#E3120B]">
                <Newspaper className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight">The Pulse</h1>
                <p className="text-xs text-gray-400">AI-Powered Economic Briefing</p>
              </div>
            </div>
            <span className="rounded border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-xs text-amber-300">
              Prototype — not official Economist content
            </span>
          </div>
        </div>
      </header>

      {/* Controls */}
      <div className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <p className="text-sm font-medium text-[#1A1A1A]">Select a country</p>
              <p className="text-xs text-gray-500">Grounded in latest IMF World Economic Outlook data</p>
            </div>
            <CountrySelector
              countries={COUNTRIES}
              onSelect={setSelectedCountry}
              selectedCode={selectedCountry?.code}
              isLoading={appState === 'loading'}
            />
            <Button
              onClick={handleGenerate}
              disabled={!selectedCountry || appState === 'loading'}
              className="bg-[#E3120B] text-white hover:bg-[#E3120B]/90"
            >
              {appState === 'loading' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Briefing&hellip;
                </>
              ) : (
                'Generate Brief'
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-4 py-8">
        {appState === 'idle' && (
          <div className="rounded-lg border-2 border-dashed border-gray-200 py-24 text-center">
            <Newspaper className="mx-auto mb-4 h-12 w-12 text-gray-300" />
            <p className="text-lg font-medium text-gray-400">
              Select a country to generate your briefing
            </p>
            <p className="mt-1 text-sm text-gray-400">
              Default focus: Indonesia / Southeast Asia
            </p>
          </div>
        )}

        {appState === 'loading' && (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="mb-4 h-10 w-10 animate-spin text-[#E3120B]" />
            <p className="text-gray-500">Fetching IMF data and generating brief&hellip;</p>
          </div>
        )}

        {appState === 'ready' && briefing && (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            {/* Left: Briefing */}
            <BriefingCard briefing={briefing} currencyForecast={currencyForecast} />

            {/* Right: AI Tools + Chat */}
            <div className="space-y-4">
              {/* AI Action Strip */}
              <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-gray-100 bg-gray-50 px-4 py-2.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    AI Analysis Tools
                  </p>
                </div>
                <div className="p-3 space-y-2">
                  {/* What If */}
                  <button
                    onClick={() => { toggleTool('scenario'); setScenario(null) }}
                    className={`w-full flex items-center gap-3 rounded-md border px-3 py-2.5 text-left text-sm font-medium transition-all cursor-pointer ${
                      activeTool === 'scenario'
                        ? 'border-amber-300 bg-amber-50 text-amber-800'
                        : 'border-gray-200 text-gray-700 hover:border-amber-200 hover:bg-amber-50/50'
                    }`}
                  >
                    <Zap className={`h-4 w-4 flex-shrink-0 ${activeTool === 'scenario' ? 'text-amber-500' : 'text-gray-400'}`} />
                    <div>
                      <p className="font-medium leading-none">What If?</p>
                      <p className="mt-0.5 text-xs text-gray-400">Trace any macro shock</p>
                    </div>
                  </button>

                  {activeTool === 'scenario' && (
                    <div className="pl-1 space-y-2">
                      <ScenarioInput onRun={handleScenario} isLoading={scenarioLoading} />
                    </div>
                  )}

                  {/* Bull vs Bear */}
                  <button
                    onClick={() => { toggleTool('debate'); handleDebate() }}
                    disabled={debateLoading}
                    className={`w-full flex items-center gap-3 rounded-md border px-3 py-2.5 text-left text-sm font-medium transition-all cursor-pointer disabled:opacity-60 ${
                      activeTool === 'debate'
                        ? 'border-red-300 bg-red-50 text-red-800'
                        : 'border-gray-200 text-gray-700 hover:border-red-200 hover:bg-red-50/50'
                    }`}
                  >
                    {debateLoading ? (
                      <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-gray-400" />
                    ) : (
                      <Swords className={`h-4 w-4 flex-shrink-0 ${activeTool === 'debate' ? 'text-red-500' : 'text-gray-400'}`} />
                    )}
                    <div>
                      <p className="font-medium leading-none">Bull vs Bear</p>
                      <p className="mt-0.5 text-xs text-gray-400">Investment debate</p>
                    </div>
                  </button>

                  {/* vs. News */}
                  <button
                    onClick={() => { toggleTool('news'); handleNewsCheck() }}
                    disabled={newsLoading}
                    className={`w-full flex items-center gap-3 rounded-md border px-3 py-2.5 text-left text-sm font-medium transition-all cursor-pointer disabled:opacity-60 ${
                      activeTool === 'news'
                        ? 'border-blue-300 bg-blue-50 text-blue-800'
                        : 'border-gray-200 text-gray-700 hover:border-blue-200 hover:bg-blue-50/50'
                    }`}
                  >
                    {newsLoading ? (
                      <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-gray-400" />
                    ) : (
                      <News className={`h-4 w-4 flex-shrink-0 ${activeTool === 'news' ? 'text-blue-500' : 'text-gray-400'}`} />
                    )}
                    <div>
                      <p className="font-medium leading-none">vs. News</p>
                      <p className="mt-0.5 text-xs text-gray-400">GDELT · last 7 days</p>
                    </div>
                  </button>
                </div>

                {/* Results */}
                {hasResult && (
                  <div className="border-t border-gray-100 p-3 space-y-3">
                    {scenario && <ScenarioCard scenario={scenario} hypothesis={scenarioHypothesis} />}
                    {debate && <DebateCard debate={debate} />}
                    {newsError && (
                      <p className="text-xs text-amber-600 bg-amber-50 rounded px-3 py-2">{newsError}</p>
                    )}
                    {newsResult && <NewsCheckCard result={newsResult} articles={newsArticles} />}
                  </div>
                )}
              </div>

              {/* Chat */}
              <ChatInterface briefing={briefing} worldBankData={indicators} />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-16 border-t border-gray-200 py-6">
        <div className="mx-auto max-w-6xl px-4 text-center text-xs text-gray-400">
          Prototype built for The Economist interview — demonstrates AI Lab-style experimentation
          with grounded analysis and conversational depth. Data: IMF World Economic Outlook.
          Not affiliated with The Economist Group.
        </div>
      </footer>
    </main>
  )
}
