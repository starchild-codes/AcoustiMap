import type { SiteStatus } from '../data/mockData'
import { recorderSummary } from '../data/mockData'

const statusConfig = {
  Online: {
    dot: 'bg-forest-500',
    text: 'text-forest-700',
    ring: 'ring-forest-200',
    bg: 'bg-forest-50',
    label: 'Online',
  },
  Offline: {
    dot: 'bg-rose-500',
    text: 'text-rose-700',
    ring: 'ring-rose-200',
    bg: 'bg-rose-50',
    label: 'Offline',
  },
  Delayed: {
    dot: 'bg-amber-500',
    text: 'text-amber-700',
    ring: 'ring-amber-200',
    bg: 'bg-amber-50',
    label: 'Delayed',
  },
}

export default function SiteStatusRow({ site }: { site: SiteStatus }) {
  const c = statusConfig[site.recorderStatus]
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-charcoal-100 last:border-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className={`h-2 w-2 rounded-full ${c.dot} shrink-0`} />
        <div className="min-w-0">
          <p className="text-sm font-medium text-charcoal-900 truncate">{site.name} Recorder</p>
          <p className="text-xs text-charcoal-400 truncate">{site.statusDetail}</p>
        </div>
      </div>
      <span className={`pill ring-1 ${c.bg} ${c.text} ${c.ring} shrink-0`}>{c.label}</span>
    </div>
  )
}

export function RecorderSummary() {
  return (
    <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-sand-50 p-3">
      <div className="flex flex-col items-center text-center">
        <span className="text-lg font-semibold text-charcoal-900 tabular-nums">
          {recorderSummary.activeRecorders}
        </span>
        <span className="text-[10px] text-charcoal-400">Active recorders</span>
      </div>
      <div className="flex flex-col items-center text-center border-x border-charcoal-100">
        <span className="text-lg font-semibold text-charcoal-900 tabular-nums">
          {recorderSummary.offlineDevices}
        </span>
        <span className="text-[10px] text-charcoal-400">Devices offline</span>
      </div>
      <div className="flex flex-col items-center text-center">
        <span className="text-sm font-semibold text-charcoal-900">{recorderSummary.lastSync}</span>
        <span className="text-[10px] text-charcoal-400">Last sync</span>
      </div>
    </div>
  )
}
