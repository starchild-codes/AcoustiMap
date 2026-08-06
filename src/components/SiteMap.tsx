import { MapPin } from 'lucide-react'
import { sites } from '../data/mockData'

const colorByRole: Record<string, string> = {
  Restoration: '#32729f',
  Baseline: '#847d72',
  Reference: '#2c5a37',
}

const positionById: Record<string, { x: string; y: string }> = {
  restored: { x: '42%', y: '58%' },
  degraded: { x: '64%', y: '74%' },
  healthy: { x: '28%', y: '38%' },
}

function Marker({ shape, color }: { shape: 'circle' | 'square' | 'triangle'; color: string }) {
  const common = 'relative block ring-2 ring-white shadow-sm'
  if (shape === 'circle') {
    return <span className={`${common} h-3.5 w-3.5 rounded-full`} style={{ background: color }} />
  }
  if (shape === 'square') {
    return <span className={`${common} h-3 w-3 rounded-sm`} style={{ background: color }} />
  }
  // triangle
  return (
    <span
      className={`${common} h-3.5 w-3.5`}
      style={{
        background: 'transparent',
        borderLeft: '7px solid transparent',
        borderRight: '7px solid transparent',
        borderBottom: `12px solid ${color}`,
        boxShadow: 'none',
      }}
      aria-hidden="true"
    />
  )
}

export default function SiteMap() {
  return (
    <div className="card p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-charcoal-400" aria-hidden="true" />
        <h2 className="section-title">Monitoring Sites</h2>
      </div>
      <div
        className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-ocean-50 ring-1 ring-ocean-100"
        role="img"
        aria-label="Map showing three monitoring sites: Restored Site, Degraded Comparison Site, and Healthy Reference Site in South Sulawesi, Indonesia"
      >
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 300" preserveAspectRatio="none">
          <rect width="400" height="300" fill="#f0f6fa" />
          {/* reef shapes */}
          <path
            d="M120 120 q30 -20 60 -5 q20 10 45 -8 q25 -15 50 5 l-5 40 q-30 10 -60 5 q-40 -8 -90 0 z"
            fill="#bbd6c3"
            opacity="0.45"
          />
          <path
            d="M200 180 q40 -10 80 0 q20 5 40 -5 l-8 35 q-50 12 -100 5 q-20 -3 -12 -35 z"
            fill="#8bb999"
            opacity="0.4"
          />
          <path
            d="M60 200 q20 -8 40 0 q15 6 30 -2 l-4 28 q-30 8 -60 4 q-10 -2 -6 -30 z"
            fill="#dcebe0"
            opacity="0.5"
          />
          {/* depth contour lines */}
          <path d="M0 240 Q100 230 200 245 T400 240" fill="none" stroke="#b4d0e3" strokeWidth="1" opacity="0.5" />
          <path d="M0 270 Q120 260 240 272 T400 268" fill="none" stroke="#b4d0e3" strokeWidth="1" opacity="0.35" />
        </svg>

        {sites.map((s) => {
          const pos = positionById[s.id]
          const color = colorByRole[s.role]
          return (
            <div
              key={s.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: pos.x, top: pos.y }}
            >
              <Marker shape={s.markerShape} color={color} />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md bg-white/95 px-2 py-0.5 text-[10px] font-medium text-charcoal-700 shadow-sm ring-1 ring-charcoal-100">
                {s.name}
              </span>
            </div>
          )
        })}
      </div>
      {/* Legend with shapes */}
      <div className="flex flex-wrap gap-3 text-[10px] text-charcoal-500">
        {sites.map((s) => (
          <div key={s.id} className="flex items-center gap-1.5">
            <Marker shape={s.markerShape} color={colorByRole[s.role]} />
            <span>{s.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
