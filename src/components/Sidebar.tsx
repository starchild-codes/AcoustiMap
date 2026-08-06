import { LayoutDashboard, AudioLines, FolderOpen, ChartBar as FileBarChart, FlaskConical, Waves, Settings, MapPin } from 'lucide-react'

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
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-forest-100 bg-white/80 backdrop-blur-sm">
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-700 text-sand-50 shadow-sm">
          <MapPin className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <p className="font-display text-base font-semibold text-forest-900">AcoustiMap</p>
          <p className="text-xs font-medium text-forest-500 tracking-wide uppercase">Restore</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1 px-3 py-2">
        {nav.map((item) => {
          const Icon = item.icon
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-forest-50 text-forest-800 ring-1 ring-forest-200'
                  : 'text-forest-600 hover:bg-sand-50 hover:text-forest-800'
              }`}
            >
              <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-forest-700' : 'text-forest-400'}`} />
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="mt-auto px-6 py-5 border-t border-forest-100">
        <p className="font-display text-sm font-medium text-forest-700 leading-snug">
          Listen to recovery.
        </p>
        <p className="font-display text-sm font-medium text-forest-700 leading-snug">
          Prove restoration.
        </p>
        <p className="mt-2 text-[11px] text-forest-400">Prototype · v0.1</p>
      </div>
    </aside>
  )
}
