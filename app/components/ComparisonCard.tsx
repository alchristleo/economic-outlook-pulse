'use client'

import { Card } from '@/components/ui/card'
import type { ComparisonData, WorldBankIndicator } from '@/types'

interface Props {
  data: ComparisonData
  baseCountryName: string
  baseIndicators: WorldBankIndicator[]
}

const COMPARISON_ROWS = [
  { code: 'NGDP_RPCH',   label: 'GDP growth',      unit: '%',     higherIsBetter: true },
  { code: 'PCPIPCH',     label: 'Inflation',        unit: '%',     higherIsBetter: false },
  { code: 'GGXCNL_NGDP', label: 'Fiscal balance',  unit: '% GDP', higherIsBetter: true },
  { code: 'BCA_NGDPD',   label: 'Current account', unit: '% GDP', higherIsBetter: true },
  { code: 'LUR',         label: 'Unemployment',     unit: '%',     higherIsBetter: false },
  { code: 'GGXWDG_NGDP', label: 'Govt debt',       unit: '% GDP', higherIsBetter: false },
]

function getValue(indicators: WorldBankIndicator[], code: string): number | null {
  return indicators.find((i) => i.code === code)?.value ?? null
}

function fmt(val: number | null): string {
  if (val === null) return '—'
  return val.toFixed(1)
}

interface PillProps {
  base: number | null
  compare: number | null
  higherIsBetter: boolean
}

function DiffPill({ base, compare, higherIsBetter }: PillProps) {
  if (base === null || compare === null) {
    return <span className="text-xs text-gray-400">—</span>
  }
  const diff = compare - base
  if (Math.abs(diff) < 0.05) {
    return (
      <span className="inline-block rounded-full bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-500">
        ≈0
      </span>
    )
  }
  const isBetter = higherIsBetter ? diff > 0 : diff < 0
  const sign = diff > 0 ? '+' : ''
  return (
    <span
      className={`inline-block rounded-full px-1.5 py-0.5 text-xs font-medium ${
        isBetter ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
      }`}
    >
      {sign}{diff.toFixed(1)}pp
    </span>
  )
}

export default function ComparisonCard({ data, baseCountryName, baseIndicators }: Props) {
  const latestYear = baseIndicators.find((i) => i.year !== null)?.year

  return (
    <Card className="overflow-hidden border border-gray-200 shadow-none">
      <div className="border-b border-gray-100 bg-gray-50 px-4 py-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Country Comparison
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="w-36 px-4 py-2 text-left text-xs font-medium text-gray-500">
                Indicator
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">
                {baseCountryName}
                <span className="ml-1 text-[10px] font-normal text-gray-400">(base)</span>
              </th>
              {data.countries.map((c) => (
                <th
                  key={c.code}
                  className="px-4 py-2 text-right text-xs font-medium text-gray-700"
                >
                  {c.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPARISON_ROWS.map((row, i) => {
              const baseVal = getValue(baseIndicators, row.code)
              return (
                <tr
                  key={row.code}
                  className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}
                >
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-gray-600">
                    {row.label}
                    <span className="ml-1 text-gray-400">({row.unit})</span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-xs font-medium text-gray-800">
                    {fmt(baseVal)}
                  </td>
                  {data.countries.map((c) => {
                    const cVal = getValue(c.indicators, row.code)
                    return (
                      <td key={c.code} className="px-4 py-2.5 text-right">
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-xs font-medium text-gray-800">
                            {fmt(cVal)}
                          </span>
                          <DiffPill
                            base={baseVal}
                            compare={cVal}
                            higherIsBetter={row.higherIsBetter}
                          />
                        </div>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="border-t border-gray-100 px-4 py-2">
        <p className="text-right text-xs text-gray-400">
          IMF WEO data{latestYear ? ` · ${latestYear}` : ''} · green pill = better vs {baseCountryName}
        </p>
      </div>
    </Card>
  )
}
