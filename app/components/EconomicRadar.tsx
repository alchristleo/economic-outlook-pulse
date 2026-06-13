'use client'

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts'
import type { EconomicHealthScore, Sentiment } from '@/types'

interface EconomicRadarProps {
  healthScore: EconomicHealthScore
}

const SENTIMENT_CONFIG: Record<Sentiment, { label: string; color: string; bg: string }> = {
  strong:     { label: 'Strong',     color: '#16a34a', bg: 'bg-green-50 border-green-200 text-green-700' },
  moderate:   { label: 'Moderate',   color: '#ca8a04', bg: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
  weak:       { label: 'Weak',       color: '#ea580c', bg: 'bg-orange-50 border-orange-200 text-orange-700' },
  vulnerable: { label: 'Vulnerable', color: '#E3120B', bg: 'bg-red-50 border-red-200 text-red-700' },
}

export default function EconomicRadar({ healthScore }: EconomicRadarProps) {
  const config = SENTIMENT_CONFIG[healthScore.sentiment]

  const chartData = healthScore.dimensions.map((d) => ({
    dimension: d.name,
    score: d.score,
    fullMark: 10,
  }))

  return (
    <div className="space-y-4">
      {/* Score header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Economic Health Index
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-4xl font-bold text-[#1A1A1A]">{healthScore.composite}</span>
            <span className="text-lg text-gray-400">/100</span>
          </div>
        </div>
        <span className={`rounded border px-3 py-1 text-sm font-semibold ${config.bg}`}>
          {config.label}
        </span>
      </div>

      {/* Radar chart */}
      <ResponsiveContainer width="100%" height={260}>
        <RadarChart data={chartData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis
            dataKey="dimension"
            tick={{ fontSize: 11, fill: '#6b7280' }}
          />
          <Radar
            dataKey="score"
            stroke={config.color}
            fill={config.color}
            fillOpacity={0.15}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>

      {/* Dimension breakdown bars */}
      <div className="grid grid-cols-1 gap-1.5">
        {healthScore.dimensions.map((d) => (
          <div key={d.name} className="flex items-center gap-3">
            <span className="w-36 shrink-0 text-xs text-gray-500">{d.name}</span>
            <div className="flex-1 overflow-hidden rounded-full bg-gray-100 h-1.5">
              <div
                className="h-1.5 rounded-full transition-all"
                style={{ width: `${d.score * 10}%`, backgroundColor: config.color }}
              />
            </div>
            <span className="w-8 text-right text-xs font-medium text-gray-700">
              {d.score}/10
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
