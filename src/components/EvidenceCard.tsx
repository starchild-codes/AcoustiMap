import type { AcousticEvidence } from '../data/mockData'
import SpectrogramPreview from './SpectrogramPreview'

const toneStyles = {
  healthy: {
    ring: 'ring-forest-200',
    accent: 'bg-forest-600',
    label: 'text-forest-800',
    bar: 'bg-forest-500',
    badge: 'bg-forest-50 text-forest-700 ring-forest-200',
  },
  restored: {
    ring: 'ring-ocean-200',
    accent: 'bg-ocean-600',
    label: 'text-ocean-800',
    bar: 'bg-ocean-500',
    badge: 'bg-ocean-50 text-ocean-700 ring-ocean-200',
  },
  degraded: {
    ring: 'ring-charcoal-200',
    accent: 'bg-charcoal-400',
    label: 'text-charcoal-700',
    bar: 'bg-charcoal-400',
    badge: 'bg-sand-100 text-charcoal-700 ring-charcoal-200',
  },
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="h-1 w-full rounded-full bg-sand-100 overflow-hidden">
      <div
        className={`h-full rounded-full ${color} transition-all duration-700`}
        style={{ width: `${(value / max) * 100}%` }}
      />
    </div>
  )
}

function MetricRow({
  label,
  value,
  bar,
  color,
  max,
}: {
  label: string
  value: string
  bar?: boolean
  color?: string
  max?: number
  numValue?: number
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[11px] text-charcoal-500">{label}</span>
        <span className="text-sm font-semibold text-charcoal-900 tabular-nums">{value}</span>
      </div>
      {bar && color && max !== undefined && <MiniBar value={parseFloat(value)} max={max} color={color} />}
    </div>
  )
}

export default function EvidenceCard({ evidence }: { evidence: AcousticEvidence }) {
  const t = toneStyles[evidence.tone]
  const isRestored = evidence.tone === 'restored'
  return (
    <div
      className={`card p-5 flex flex-col gap-4 ring-1 ${t.ring} ${
        isRestored ? 'ring-2 ring-ocean-300' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${t.accent}`} />
          <h3 className={`font-display text-base font-semibold ${t.label}`}>{evidence.label}</h3>
        </div>
        <span className="text-[10px] font-medium text-charcoal-400 uppercase tracking-wide">
          {evidence.habitat}
        </span>
      </div>

      <SpectrogramPreview variant={evidence.tone} />

      <div className="flex flex-col gap-3">
        <MetricRow
          label="Acoustic Complexity Index"
          value={evidence.acousticComplexityIndex.toFixed(2)}
          bar
          color={t.bar}
          max={1}
        />
        <MetricRow
          label="Bioacoustic Index"
          value={evidence.bioacousticIndex.toFixed(1)}
          bar
          color={t.bar}
          max={10}
        />
        <MetricRow
          label="Biological-frequency occupancy"
          value={`${evidence.biologicalFrequencyOccupancy}%`}
          bar
          color={t.bar}
          max={100}
        />
        <div className="flex items-center justify-between pt-0.5">
          <span className="text-[11px] text-charcoal-500">Human-noise pressure</span>
          <span className={`pill ring-1 ${t.badge}`}>{evidence.humanNoisePressure}</span>
        </div>
      </div>

      {/* Similarity to healthy reference */}
      <div className="border-t border-charcoal-100 pt-3">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-[11px] text-charcoal-500">Similarity to healthy reference</span>
          <span className="text-sm font-semibold text-charcoal-900 tabular-nums">
            {evidence.similarityToHealthy}%
          </span>
        </div>
        <MiniBar value={evidence.similarityToHealthy} max={100} color={t.bar} />
      </div>
    </div>
  )
}
