'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Newspaper } from 'lucide-react'
import CountrySelector from './components/CountrySelector'
import BriefingCard from './components/BriefingCard'
import ChatInterface from './components/ChatInterface'
import { Button } from '@/components/ui/button'
import { COUNTRIES } from '@/lib/worldbank'
import type { Briefing, Country, WorldBankIndicator } from '@/types'

type AppState = 'idle' | 'loading' | 'ready'

export default function HomePage() {
  const [appState, setAppState] = useState<AppState>('idle')
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null)
  const [briefing, setBriefing] = useState<Briefing | null>(null)
  const [indicators, setIndicators] = useState<WorldBankIndicator[]>([])

  async function handleGenerate() {
    if (!selectedCountry) return
    setAppState('loading')
    setBriefing(null)

    try {
      const res = await fetch('/api/generate-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          countryCode: selectedCountry.code,
        }),
      })

      if (!res.ok) throw new Error('Failed to generate briefing')

      const data = (await res.json()) as { briefing: Briefing; indicators: WorldBankIndicator[] }
      setBriefing(data.briefing)
      setIndicators(data.indicators)
      setAppState('ready')
    } catch {
      toast.error('Failed to generate briefing. Please try again.')
      setAppState('idle')
    }
  }

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
              <p className="text-xs text-gray-500">Grounded in latest World Bank public data</p>
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
            <p className="text-gray-500">Fetching World Bank data and generating brief&hellip;</p>
          </div>
        )}

        {appState === 'ready' && briefing && (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <BriefingCard briefing={briefing} indicators={indicators} />
            <ChatInterface briefing={briefing} worldBankData={indicators} />
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-16 border-t border-gray-200 py-6">
        <div className="mx-auto max-w-6xl px-4 text-center text-xs text-gray-400">
          Prototype built for The Economist interview — demonstrates AI Lab-style experimentation
          with grounded analysis and conversational depth. Data: World Bank Open Data.
          Not affiliated with The Economist Group.
        </div>
      </footer>
    </main>
  )
}
