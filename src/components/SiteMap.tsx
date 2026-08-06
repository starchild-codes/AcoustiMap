import { MapPin } from 'lucide-react'

const points = [
  { id: 'restored', label: 'Restored Site', x: '42%', y: '58%', color: '#32729f' },
  { id: 'degraded', label: 'Degraded Comparison Site', x: '64%', y: '74%', color: '#c0b094' },
  { id: 'healthy', label: 'Healthy Reference Site', x: '28%', y: '38%', color: '#2c5a37' },
]

export default function SiteMap() {
  return (
    <div className="card p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-forest-500" />
        <h2 className="font-display text-lg font-semibold text-forest-900">Monitoring Sites</h2>
      </div>
      <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-gradient-to-b from-ocean-50 to-ocean-100 ring-1 ring-ocean-200">
        {/* Stylized reef / coastline */}
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 300" preserveAspectRatio="none">
          <defs>
            <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d9e8f1" />
              <stop offset="100%" stopColor="#b4d0e3" />
            </linearGradient>
          </defs>
          <rect width="400" height="300" fill="url(#sea)" />
          {/* reef shapes */}
          <path d="M120 120 q30 -20 60 -5 q20 10 45 -8 q25 -15 50 5 l-5 40 q-30 10 -60 5 q-40 -8 -90 0 z" fill="#8bb999" opacity="0.5" />
          <path d="M200 180 q40 -10 80 0 q20 5 40 -5 l-8 35 q-50 12 -100 5 q-20 -3 -12 -35 z" fill="#5a9169" opacity="0.45" />
          <path d="M60 200 q20 -8 40 0 q15 6 30 -2 l-4 28 q-30 8 -60 4 q-10 -2 -6 -30 z" fill="#bbd6c3" opacity="0.5" />
          {/* depth contour lines */}
          <path d="M0 240 Q100 230 200 245 T400 240" fill="none" stroke="#82b2d2" strokeWidth="1" opacity="0.4" />
          <path d="M0 270 Q120 260 240 272 T400 268" fill="none" stroke="#82b2d2" strokeWidth="1" opacity="0.3" />
        </svg>

        {points.map((p) => (
          <div
            key={p.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 group"
            style={{ left: p.x, top: p.y }}
          >
            <span className="absolute inset-0 -m-1 rounded-full animate-ping opacity-40" style={{ background: p.color }} />
            <span className="relative block h-3 w-3 rounded-full ring-2 ring-white shadow" style={{ background: p.color }} />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md bg-white/90 px-2 py-0.5 text-[11px] font-medium text-forest-800 shadow-sm ring-1 ring-forest-100">
              {p.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
