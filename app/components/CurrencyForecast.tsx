'use client'

import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import type { CurrencyForecastData } from '@/types'

interface Props {
  data: CurrencyForecastData
}

interface ChartPoint {
  monthKey: string
  label: string
  historical?: number
  forecast?: number
  ciTop?: number
  ciBottom?: number
  isBoundary: boolean
}

function buildChartData(data: CurrencyForecastData): { points: ChartPoint[]; boundaryLabel: string } {
  const histPoints: ChartPoint[] = data.historical.map((r, i) => ({
    monthKey: r.month,
    label: format(parseISO(r.month + '-01'), "MMM ''yy"),
    historical: r.rate,
    isBoundary: i === data.historical.length - 1,
  }))

  const lastHist = data.historical[data.historical.length - 1]
  const boundaryLabel = format(parseISO(lastHist.month + '-01'), "MMM ''yy")

  // Bridge: last historical point also anchors forecast line and CI band
  histPoints[histPoints.length - 1].forecast = lastHist.rate
  histPoints[histPoints.length - 1].ciTop = lastHist.rate
  histPoints[histPoints.length - 1].ciBottom = lastHist.rate

  const forecastPoints: ChartPoint[] = data.forecast.map((r, i) => ({
    monthKey: r.month,
    label: format(parseISO(r.month + '-01'), "MMM ''yy"),
    forecast: r.rate,
    ciTop: data.forecastCI.upper[i],
    ciBottom: data.forecastCI.lower[i],
    isBoundary: false,
  }))

  return { points: [...histPoints, ...forecastPoints], boundaryLabel }
}

function formatRate(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 })
}

// Show every 6th x-axis label to avoid crowding
function xTickFormatter(value: string, index: number) {
  return index % 6 === 0 ? value : ''
}

export default function CurrencyForecast({ data }: Props) {
  const { points, boundaryLabel } = buildChartData(data)
  const { currencyCode, regressionSlope, rSquared } = data

  const trendLabel =
    regressionSlope > 0
      ? `Depreciating (${currencyCode} weakening vs USD)`
      : regressionSlope < 0
      ? `Appreciating (${currencyCode} strengthening vs USD)`
      : 'Flat trend'

  const r2Color = rSquared >= 0.7 ? 'text-green-700' : rSquared >= 0.4 ? 'text-amber-700' : 'text-red-700'

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          {currencyCode}/USD &mdash; 12-Month Forecast
        </h3>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`text-xs ${r2Color}`}>
            R² {rSquared.toFixed(3)}
          </Badge>
          <span className="text-xs text-gray-400">{trendLabel}</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={points} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="label"
            tickFormatter={xTickFormatter}
            tick={{ fontSize: 10, fill: '#6b7280' }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatRate}
            tick={{ fontSize: 10, fill: '#6b7280' }}
            tickLine={false}
            axisLine={false}
            width={60}
          />
          <Tooltip
            formatter={(value: number, name: string) => [formatRate(value), name]}
            labelFormatter={(label) => label}
            contentStyle={{ fontSize: 11, borderRadius: 4 }}
          />
          <Legend
            iconType="line"
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          />
          <ReferenceLine
            x={boundaryLabel}
            stroke="#9ca3af"
            strokeDasharray="4 2"
            label={{ value: 'Today', position: 'insideTopRight', fontSize: 10, fill: '#9ca3af' }}
          />
          {/* CI band: ciTop filled red at 10% opacity, ciBottom white to mask bottom — standard Recharts CI pattern */}
          <Area
            type="monotone"
            dataKey="ciTop"
            fill="#E3120B"
            fillOpacity={0.10}
            stroke="none"
            legendType="none"
            name=""
            connectNulls={false}
          />
          <Area
            type="monotone"
            dataKey="ciBottom"
            fill="white"
            fillOpacity={1}
            stroke="none"
            legendType="none"
            name=""
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="historical"
            name="Historical"
            stroke="#E3120B"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="forecast"
            name="Forecast (95% CI)"
            stroke="#1A1A1A"
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={false}
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <p className="text-right text-xs text-gray-400">
        Linear trend model &middot; ECB/Frankfurter data &middot; Not investment advice
      </p>
    </div>
  )
}
