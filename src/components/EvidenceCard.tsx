import type { AcousticEvidence } from '../data/mockData'

const toneStyles = {
  healthy: {
    ring: 'ring-forest-200',
    accent: 'bg-forest-500',
    label: 'text-forest-700',
    bar: 'bg-forest-500',
    badge: 'bg-forest-50 text-forest-700 ring-forest-200',
  },
  restored: {
    ring: 'ring-ocean-200',
    accent: 'bg-ocean-500',
    label: 'text-ocean-700',
    bar: 'bg-ocean-500',
    badge: 'bg-ocean-50 text-ocean-700 ring-ocean-200',
  },
  degraded: {
    ring: 'ring-sand-300',
    accent: 'bg-sand-400',
    label: 'text-forest-600',
    bar: 'bg-sand-400',
    badge: 'bg-sand-100 text-forest-700 ring-sand-300',
  },
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-sand-100 overflow-hidden">
      <div
        className={`h-full rounded-full ${color} transition-all duration-700`}
        style={{ width: `${(value / max) * 100}%` }}
      />
    </div>
  )
}

export default function EvidenceCard({ evidence }: { evidence: AcousticEvidence }) {
  const t = toneStyles[evidence.tone]
  return (
    <div className={`card p-5 ring-1 ${t.ring} flex flex-col gap-4`}>
      <div className="flex items-center gap-2.5">
        <span className={`h-2.5 w-2.5 rounded-full ${t.accent}`} />
        <h3 className={`font-display text-lg font-semibold ${t.label}`}>{evidence.label}</h3>
      </div>

      <div className="flex flex-col gap-3.5">
        <div>
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-xs text-forest-500">Acoustic Complexity Index</span>
            <span className="text-sm font-semibold text-forest-900">
              {evidence.acousticComplexityIndex.toFixed(2)}
            </span>
          </div>
          <Bar value={evidence.acousticComplexityIndex} max={1} color={t.bar} />
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-xs text-forest-500">Bioacoustic Index</span>
            <span className="text-sm font-semibold text-forest-900">
              {evidence.bioacousticIndex.toFixed(1)}
            </span>
          </div>
          <Bar value={evidence.bioacousticIndex} max={10} color={t.bar} />
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-xs text-forest-500">Biological-frequency occupancy</span>
            <span className="text-sm font-semibold text-forest-900">
              {evidence.biologicalFrequencyOccupancy}%
            </span>
          </div>
          <Bar value={evidence.biologicalFrequencyOccupancy} max={100} color={t.bar} />
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-forest-500">Human-noise pressure</span>
          <span className={`pill ring-1 ${t.badge}`}>{evidence.humanNoisePressure}</span>
        </div>
      </div>
    </div>
  )
}
