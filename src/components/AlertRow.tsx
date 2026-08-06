import { TriangleAlert as AlertTriangle, CircleCheck as CheckCircle2, Info } from 'lucide-react'
import type { AlertItem } from '../data/mockData'

const config = {
  warning: {
    icon: AlertTriangle,
    ring: 'ring-amber-200',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    iconColor: 'text-amber-500',
  },
  positive: {
    icon: CheckCircle2,
    ring: 'ring-forest-200',
    bg: 'bg-forest-50',
    text: 'text-forest-800',
    iconColor: 'text-forest-600',
  },
  info: {
    icon: Info,
    ring: 'ring-ocean-200',
    bg: 'bg-ocean-50',
    text: 'text-ocean-800',
    iconColor: 'text-ocean-500',
  },
}

export default function AlertRow({ alert }: { alert: AlertItem }) {
  const c = config[alert.type]
  const Icon = c.icon
  return (
    <div className={`flex items-start gap-3 rounded-xl ${c.bg} ring-1 ${c.ring} px-4 py-3`}>
      <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${c.iconColor}`} />
      <p className={`text-sm leading-relaxed ${c.text}`}>{alert.message}</p>
    </div>
  )
}
