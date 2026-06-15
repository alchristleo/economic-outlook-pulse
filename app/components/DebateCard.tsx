'use client'

import { Card } from '@/components/ui/card'
import type { DebateResult } from '@/types'

interface Props {
  debate: DebateResult
}

export default function DebateCard({ debate }: Props) {
  return (
    <Card className="overflow-hidden border border-gray-200 shadow-sm mt-4">
      <div className="grid grid-cols-2 divide-x divide-gray-100">
        {/* Bull case */}
        <div className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-green-700">
              Bull Case
            </h4>
          </div>
          <ul className="space-y-2">
            {debate.bull_case.map((arg, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-700 leading-relaxed">
                <span className="mt-0.5 text-green-500 flex-shrink-0">▲</span>
                {arg}
              </li>
            ))}
          </ul>
        </div>

        {/* Bear case */}
        <div className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-red-700">
              Bear Case
            </h4>
          </div>
          <ul className="space-y-2">
            {debate.bear_case.map((arg, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-700 leading-relaxed">
                <span className="mt-0.5 text-red-500 flex-shrink-0">▼</span>
                {arg}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Verdict */}
      <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
        <span className="mr-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
          Verdict
        </span>
        <span className="text-xs italic text-gray-700">{debate.verdict}</span>
      </div>
    </Card>
  )
}
