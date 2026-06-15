'use client'

import { Card } from '@/components/ui/card'
import { AlertTriangle, TrendingUp } from 'lucide-react'
import type { ScenarioResult } from '@/types'

interface Props {
  scenario: ScenarioResult
  hypothesis: string
}

export default function ScenarioCard({ scenario, hypothesis }: Props) {
  return (
    <Card className="overflow-hidden border border-gray-200 shadow-sm">
      <div className="border-b border-gray-100 bg-amber-50 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
          Scenario Analysis
        </p>
        <p className="mt-0.5 text-sm font-medium text-gray-800">
          &ldquo;{hypothesis}&rdquo;
        </p>
        <p className="mt-1 text-xs text-gray-500 italic">{scenario.hypothesis_summary}</p>
      </div>

      <div className="space-y-4 p-4">
        {/* Causal chain */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Causal Chain
          </p>
          <ol className="space-y-2">
            {scenario.chain_of_effects.map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Risks + Opportunities */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-red-600">
              <AlertTriangle className="h-3 w-3" /> Revised Risks
            </p>
            <ul className="space-y-1">
              {scenario.revised_risks.map((r, i) => (
                <li key={i} className="text-xs leading-relaxed text-gray-700">
                  <span className="mr-1 text-red-400">&#9642;</span>{r}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-green-600">
              <TrendingUp className="h-3 w-3" /> Opportunities
            </p>
            <ul className="space-y-1">
              {scenario.revised_opportunities.map((o, i) => (
                <li key={i} className="text-xs leading-relaxed text-gray-700">
                  <span className="mr-1 text-green-400">&#9642;</span>{o}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom line */}
        <div className="rounded-md bg-gray-50 px-3 py-2">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Net Impact
          </p>
          <p className="text-sm font-medium text-gray-800">{scenario.bottom_line}</p>
        </div>
      </div>
    </Card>
  )
}
