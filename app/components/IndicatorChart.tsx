'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { formatIndicatorValue } from '@/lib/worldbank'
import type { WorldBankIndicator } from '@/types'

interface IndicatorChartProps {
  indicators: WorldBankIndicator[]
}

function TrendIcon({ value }: { value: number | null }) {
  if (value === null) return <Minus className="h-4 w-4 text-gray-400" />
  if (value > 0) return <TrendingUp className="h-4 w-4 text-green-600" />
  return <TrendingDown className="h-4 w-4 text-red-600" />
}

export default function IndicatorChart({ indicators }: IndicatorChartProps) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {indicators.map((ind) => (
        <div
          key={ind.code}
          className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 leading-tight">
            {ind.name}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold text-[#1A1A1A]">
              {formatIndicatorValue(ind.code, ind.value)}
            </span>
            <TrendIcon value={ind.value} />
          </div>
        </div>
      ))}
    </div>
  )
}
