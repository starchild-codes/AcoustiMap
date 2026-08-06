import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react'
import type { Metric } from '../data/mockData'

const toneStyles: Record<string, string> = {
  positive: 'bg-forest-50 text-forest-700 ring-forest-200',
  neutral: 'bg-sand-100 text-forest-700 ring-sand-300',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200',
  info: 'bg-ocean-50 text-ocean-700 ring-ocean-200',
}

const trendIcon = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus,
}

const trendColor = {
  up: 'text-forest-600',
  down: 'text-rose-600',
  flat: 'text-forest-400',
}

export default function MetricCard({ metric }: { metric: Metric }) {
  const TrendIcon = metric.trend ? trendIcon[metric.trend] : null
  return (
    <div className="card p-5 flex flex-col gap-3 transition-shadow hover:shadow-lg hover:-translate-y-0.5 duration-200">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium text-forest-600 leading-snug">
          {metric.title}
        </h3>
        <div className="group relative shrink-0">
          <Info className="h-4 w-4 text-forest-400 hover:text-forest-600 cursor-help" />
          <div className="pointer-events-none absolute right-0 top-7 z-10 w-56 rounded-xl bg-forest-900 px-3 py-2 text-xs text-sand-50 opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
            {metric.tooltip}
          </div>
        </div>
      </div>

      <div className="flex items-end gap-2">
        <span className="font-display text-3xl font-semibold text-forest-900 tracking-tight">
          {metric.value}
        </span>
        {TrendIcon && (
          <TrendIcon className={`h-5 w-5 mb-1.5 ${metric.trend ? trendColor[metric.trend] : ''}`} />
        )}
      </div>

      {metric.supportingValue && (
        <p className="text-xs text-forest-500">{metric.supportingValue}</p>
      )}
      {metric.change && (
        <p className="text-xs text-forest-500">{metric.change}</p>
      )}

      <span className={`pill ring-1 ${toneStyles[metric.statusTone]} mt-auto self-start`}>
        {metric.status}
      </span>
    </div>
  )
}
