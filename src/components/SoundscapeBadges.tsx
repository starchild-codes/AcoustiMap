import { CircleCheck as CheckCircle2, TriangleAlert as AlertTriangle, Circle as XCircle, FileAudio, Database, Hand, FlaskConical } from 'lucide-react'
import type { QualityStatus, MetricSource, HabitatCategory } from '../soundscape/types'
import { HABITAT_LABELS, QUALITY_LABELS } from '../soundscape/types'

export function QualityBadge({ status, size = 'sm' }: { status: QualityStatus; size?: 'sm' | 'xs' }) {
  const styles: Record<QualityStatus, { bg: string; text: string; ring: string; icon: typeof CheckCircle2 }> = {
    good: { bg: 'bg-forest-50', text: 'text-forest-700', ring: 'ring-forest-200', icon: CheckCircle2 },
    review: { bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-200', icon: AlertTriangle },
    excluded: { bg: 'bg-rose-50', text: 'text-rose-700', ring: 'ring-rose-200', icon: XCircle },
  }
  const s = styles[status]
  const Icon = s.icon
  const sizeClasses = size === 'xs' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full ${s.bg} ${s.text} ring-1 ${s.ring} ${sizeClasses} font-medium`}>
      <Icon className={size === 'xs' ? 'h-2.5 w-2.5' : 'h-3 w-3'} aria-hidden="true" />
      {QUALITY_LABELS[status]}
    </span>
  )
}

export function HabitatBadge({ category, size = 'sm' }: { category: HabitatCategory; size?: 'sm' | 'xs' }) {
  const styles: Record<HabitatCategory, string> = {
    healthy: 'bg-forest-50 text-forest-700 ring-forest-200',
    restored: 'bg-ocean-50 text-ocean-700 ring-ocean-200',
    degraded: 'bg-rose-50 text-rose-700 ring-rose-200',
  }
  const sizeClasses = size === 'xs' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'
  return (
    <span className={`inline-flex items-center rounded-full ring-1 ${styles[category]} ${sizeClasses} font-medium`}>
      {HABITAT_LABELS[category]}
    </span>
  )
}

export function MetricSourceBadge({ source }: { source: MetricSource }) {
  const styles: Record<MetricSource, { bg: string; text: string; icon: typeof FileAudio; label: string }> = {
    browser: { bg: 'bg-ocean-50', text: 'text-ocean-700', icon: FileAudio, label: 'Browser calculated' },
    python: { bg: 'bg-forest-50', text: 'text-forest-700', icon: Database, label: 'Python imported' },
    manual: { bg: 'bg-sand-100', text: 'text-charcoal-700', icon: Hand, label: 'Manual' },
    prototype: { bg: 'bg-amber-50', text: 'text-amber-700', icon: FlaskConical, label: 'Prototype illustrative' },
  }
  const s = styles[source]
  const Icon = s.icon
  return (
    <span className={`inline-flex items-center gap-1 rounded-full ${s.bg} ${s.text} px-2 py-0.5 text-[10px] font-medium`}>
      <Icon className="h-2.5 w-2.5" aria-hidden="true" />
      {s.label}
    </span>
  )
}
