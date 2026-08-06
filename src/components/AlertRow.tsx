import {
  TriangleAlert as AlertTriangle,
  CircleCheck as CheckCircle2,
  Info,
  Radio,
} from 'lucide-react'
import type { AlertItem } from '../data/mockData'

const config = {
  warning: {
    icon: AlertTriangle,
    ring: 'ring-amber-200',
    bg: 'bg-amber-50/70',
    text: 'text-amber-900',
    iconColor: 'text-amber-500',
    label: 'Warning',
  },
  positive: {
    icon: CheckCircle2,
    ring: 'ring-forest-200',
    bg: 'bg-forest-50/70',
    text: 'text-forest-800',
    iconColor: 'text-forest-600',
    label: 'Positive',
  },
  info: {
    icon: Info,
    ring: 'ring-ocean-200',
    bg: 'bg-ocean-50/70',
    text: 'text-ocean-800',
    iconColor: 'text-ocean-500',
    label: 'Information',
  },
  device: {
    icon: Radio,
    ring: 'ring-charcoal-200',
    bg: 'bg-sand-50',
    text: 'text-charcoal-700',
    iconColor: 'text-charcoal-500',
    label: 'Device',
  },
}

export default function AlertRow({ alert }: { alert: AlertItem }) {
  const c = config[alert.type]
  const Icon = c.icon
  return (
    <div className={`flex items-start gap-3 rounded-lg ${c.bg} ring-1 ${c.ring} px-3.5 py-3`}>
      <Icon className={`h-4.5 w-4.5 shrink-0 mt-0.5 ${c.iconColor}`} aria-hidden="true" />
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <p className={`text-sm leading-snug ${c.text}`}>{alert.message}</p>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium uppercase tracking-wide text-charcoal-400">
            {c.label}
          </span>
          <span className="text-charcoal-300" aria-hidden="true">·</span>
          <span className="text-[11px] text-charcoal-400">{alert.timestamp}</span>
        </div>
      </div>
    </div>
  )
}
