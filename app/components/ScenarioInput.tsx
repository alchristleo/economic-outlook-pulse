'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Zap } from 'lucide-react'

interface Props {
  onRun: (hypothesis: string) => void
  isLoading: boolean
}

const EXAMPLE_HYPOTHESES = [
  'What if oil prices fall 40%?',
  'What if the Fed raises rates 200bps?',
  'What if China imposes trade tariffs?',
]

export default function ScenarioInput({ onRun, isLoading }: Props) {
  const [hypothesis, setHypothesis] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!hypothesis.trim() || isLoading) return
    onRun(hypothesis.trim())
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Zap className="h-4 w-4 text-[#E3120B]" />
        <h3 className="text-sm font-semibold text-[#1A1A1A]">Scenario Simulator</h3>
        <span className="text-xs text-gray-400">— trace the causal chain of any macro shock</span>
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={hypothesis}
          onChange={(e) => setHypothesis(e.target.value)}
          placeholder="What if…"
          maxLength={500}
          disabled={isLoading}
          className="flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#E3120B] disabled:opacity-50 transition-colors"
        />
        <Button
          type="submit"
          size="sm"
          disabled={!hypothesis.trim() || isLoading}
          className="bg-[#E3120B] text-white hover:bg-[#E3120B]/90 whitespace-nowrap"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Run Scenario'}
        </Button>
      </form>
      <div className="mt-2 flex flex-wrap gap-1">
        {EXAMPLE_HYPOTHESES.map((h) => (
          <button
            key={h}
            onClick={() => setHypothesis(h)}
            className="rounded border border-gray-200 px-2 py-0.5 text-xs text-gray-500 hover:border-[#E3120B] hover:text-[#E3120B] transition-colors"
          >
            {h}
          </button>
        ))}
      </div>
    </div>
  )
}
