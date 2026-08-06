import {
  LayoutDashboard,
  AudioLines,
  FolderOpen,
  ChartBar as FileBarChart,
  FlaskConical,
  Waves,
  Settings,
  MapPin,
} from 'lucide-react'

export type PageId =
  | 'overview'
  | 'soundscape'
  | 'recordings'
  | 'projects'
  | 'methodology'
  | 'reports'
  | 'settings'

interface NavItem {
  id: PageId
  label: string
  icon: typeof LayoutDashboard
}

const nav: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'soundscape', label: 'Soundscape Comparison', icon: Waves },
  { id: 'recordings', label: 'Recording Explorer', icon: AudioLines },
  { id: 'projects', label: 'Projects', icon: FolderOpen },
  { id: 'methodology', label: 'Methodology', icon: FlaskConical },
  { id: 'reports', label: 'Reports', icon: FileBarChart },
  { id: 'settings', label: 'Settings', icon: Settings },
]

interface SidebarProps {
  active: PageId
  onNavigate: (id: PageId) => void
}

export default function Sidebar({ active, onNavigate }: SidebarProps) {
  return (
    <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-charcoal-100 bg-white">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-forest-700 text-sand-50">
          <MapPin className="h-4.5 w-4.5" aria-hidden="true" />
        </div>
        <div className="leading-tight">
          <p className="font-display text-sm font-semibold text-charcoal-900">AcoustiMap</p>
          <p className="text-[10px] font-medium text-charcoal-400 tracking-wider uppercase">Restore</p>
        </div>
      </div>

      <nav className="flex flex-col gap-0.5 px-3 py-2" aria-label="Main navigation">
        {nav.map((item) => {
          const Icon = item.icon
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-forest-50 text-forest-800'
                  : 'text-charcoal-500 hover:bg-sand-50 hover:text-charcoal-700'
              }`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 ${isActive ? 'text-forest-600' : 'text-charcoal-400'}`}
                aria-hidden="true"
              />
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="mt-auto border-t border-charcoal-100 px-5 py-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-charcoal-400">Prototype Version</span>
          <span className="text-[11px] font-semibold text-charcoal-600 tabular-nums">v0.1</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[11px] font-medium text-charcoal-400">Methodology Status</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-amber-200">
            Experimental
          </span>
        </div>
      </div>
    </aside>
  )
}
