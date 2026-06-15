'use client'

import type { LensResult, LensType } from '@/types'

const LENS_CONFIG: Record<LensType, { label: string; color: string; border: string; bg: string }> = {
  bond: {
    label: 'Bond Investor',
    color: 'text-blue-700',
    border: 'border-l-blue-500',
    bg: 'bg-blue-50',
  },
  equity: {
    label: 'Equity Analyst',
    color: 'text-emerald-700',
    border: 'border-l-emerald-500',
    bg: 'bg-emerald-50',
  },
  central_bank: {
    label: 'Central Banker',
    color: 'text-purple-700',
    border: 'border-l-purple-500',
    bg: 'bg-purple-50',
  },
}

interface LensCardProps {
  result: LensResult
}

export default function LensCard({ result }: LensCardProps) {
  const cfg = LENS_CONFIG[result.lens]

  return (
    <div className={`border-l-4 rounded-r-md p-4 ${cfg.border} ${cfg.bg} space-y-3`}>
      <div>
        <p className={`text-xs font-semibold uppercase tracking-wider ${cfg.color}`}>
          {cfg.label} View
        </p>
        <p className="mt-1 text-sm font-semibold text-gray-800">{result.headline}</p>
      </div>

      <ul className="space-y-1.5">
        {result.signals.map((signal, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
            <span className={`mt-1 text-xs font-bold ${cfg.color}`}>›</span>
            {signal}
          </li>
        ))}
      </ul>

      <div className="rounded-md bg-red-50 border border-red-100 px-3 py-2">
        <span className="text-xs font-semibold text-red-600 uppercase tracking-wider">Key Risk: </span>
        <span className="text-xs text-red-700">{result.key_risk}</span>
      </div>

      <p className="text-sm italic text-gray-600">{result.bottom_line}</p>
    </div>
  )
}
