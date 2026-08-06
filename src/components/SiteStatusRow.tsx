import type { SiteStatus } from '../data/mockData'

const statusConfig = {
  Online: { dot: 'bg-forest-500', text: 'text-forest-700', ring: 'ring-forest-200', bg: 'bg-forest-50' },
  Offline: { dot: 'bg-rose-500', text: 'text-rose-700', ring: 'ring-rose-200', bg: 'bg-rose-50' },
  Delayed: { dot: 'bg-amber-500', text: 'text-amber-700', ring: 'ring-amber-200', bg: 'bg-amber-50' },
}

export default function SiteStatusRow({ site }: { site: SiteStatus }) {
  const c = statusConfig[site.recorderStatus]
  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-forest-100 last:border-0">
      <div className="flex items-center gap-3">
        <span className={`h-2.5 w-2.5 rounded-full ${c.dot} shrink-0`} />
        <div>
          <p className="text-sm font-medium text-forest-900">{site.name} Recorder</p>
          <p className="text-xs text-forest-500">{site.statusDetail}</p>
        </div>
      </div>
      <span className={`pill ring-1 ${c.bg} ${c.text} ${c.ring}`}>{site.recorderStatus}</span>
    </div>
  )
}
