'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import EconomicRadar from './EconomicRadar'
import CurrencyForecast from './CurrencyForecast'
import type { Briefing, CurrencyForecastData } from '@/types'
import { format } from 'date-fns'
import { AlertTriangle, TrendingUp, Eye } from 'lucide-react'

interface BriefingCardProps {
  briefing: Briefing
  currencyForecast?: CurrencyForecastData | null
}

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
          </div>
        </div>
        <p className="text-base leading-relaxed text-gray-700">{briefing.executive_summary}</p>
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

        <p className="text-right text-xs text-gray-400">
          Generated {format(new Date(briefing.generated_at), 'PPP p')}
        </p>
      </CardContent>
    </Card>
  )
}
