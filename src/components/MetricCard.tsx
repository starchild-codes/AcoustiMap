import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react'
import type { Metric } from '../data/mockData'
import CircularProgress from './CircularProgress'

const toneStyles: Record<string, string> = {
  positive: 'bg-forest-50 text-forest-700 ring-forest-200',
  neutral: 'bg-sand-100 text-charcoal-700 ring-sand-300',
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
  flat: 'text-charcoal-400',
}

export default function MetricCard({ metric }: { metric: Metric }) {
  const TrendIcon = metric.trend ? trendIcon[metric.trend] : null
  const isPrimary = metric.id === 'recovery-score'

  return (
    <div
      className={`card card-hover p-5 flex flex-col gap-3 ${
        isPrimary ? 'ring-1 ring-forest-200 bg-forest-50/30' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-xs font-medium text-charcoal-500 leading-snug uppercase tracking-wide">
          {metric.title}
        </h3>
        <div className="group relative shrink-0">
          <button
            className="text-charcoal-300 hover:text-charcoal-600 transition-colors"
            aria-label={`${metric.title} information`}
          >
            <Info className="h-4 w-4" />
          </button>
          <div
            role="tooltip"
            className="pointer-events-none absolute right-0 top-7 z-20 w-56 rounded-lg bg-charcoal-900 px-3 py-2.5 text-xs text-sand-50 opacity-0 shadow-pop transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
          >
            {metric.tooltip}
          </div>
        </div>
      </div>

      {isPrimary && metric.progress ? (
        <div className="flex items-center gap-4 py-1">
          <CircularProgress
            value={metric.progress}
            max={100}
            size={88}
            strokeWidth={7}
            label={`${metric.progress}`}
            sublabel="/ 100"
          />
          <div className="flex flex-col gap-1.5">
            {TrendIcon && (
              <span className={`inline-flex items-center gap-1 text-xs font-medium ${metric.trend ? trendColor[metric.trend] : ''}`}>
                <TrendIcon className="h-3.5 w-3.5" />
                {metric.change}
              </span>
            )}
            <span className={`pill ring-1 ${toneStyles[metric.statusTone]} self-start`}>
              {metric.status}
            </span>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-end gap-2">
            <span className="font-display text-2xl font-semibold text-charcoal-900 tracking-tight tabular-nums">
              {metric.value}
            </span>
            {TrendIcon && (
              <TrendIcon
                className={`h-4.5 w-4.5 mb-1 ${metric.trend ? trendColor[metric.trend] : ''}`}
                aria-label={metric.trend === 'up' ? 'Upward trend' : metric.trend === 'down' ? 'Downward trend' : 'No change'}
              />
            )}
          </div>

          {metric.supportingValue && (
            <p className="text-xs text-charcoal-500">{metric.supportingValue}</p>
          )}
          {!metric.supportingValue && metric.change && (
            <p className="text-xs text-charcoal-500">{metric.change}</p>
          )}

          {/* Compact valid/excluded visual for recordings */}
          {metric.id === 'recordings' && metric.breakdown && (
            <div className="flex h-2 w-full overflow-hidden rounded-full bg-sand-100">
              {metric.breakdown.map((b) => (
                <div
                  key={b.label}
                  className={b.tone === 'positive' ? 'bg-forest-500' : 'bg-amber-400'}
                  style={{ width: `${(b.value / 96) * 100}%` }}
                  aria-label={`${b.label}: ${b.value}`}
                />
              ))}
            </div>
          )}

          <span className={`pill ring-1 ${toneStyles[metric.statusTone]} mt-auto self-start`}>
            {metric.status}
          </span>
        </>
      )}
    </div>
  )
}
