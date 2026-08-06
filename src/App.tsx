import { useState } from 'react'
import Sidebar, { type PageId } from './components/Sidebar'
import TopNav from './components/TopNav'
import OverviewPage from './pages/OverviewPage'
import PlaceholderPage from './components/PlaceholderPage'
import { MapPin } from 'lucide-react'

const pageTitles: Record<PageId, string> = {
  overview: 'Overview',
  soundscape: 'Soundscape Comparison',
  recordings: 'Recording Explorer',
  projects: 'Projects',
  methodology: 'Methodology',
  reports: 'Reports',
  settings: 'Settings',
}

const navItems: { id: PageId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'soundscape', label: 'Soundscape Comparison' },
  { id: 'recordings', label: 'Recording Explorer' },
  { id: 'projects', label: 'Projects' },
  { id: 'methodology', label: 'Methodology' },
  { id: 'reports', label: 'Reports' },
  { id: 'settings', label: 'Settings' },
]

export default function App() {
  const [active, setActive] = useState<PageId>('overview')
  const [mobileOpen, setMobileOpen] = useState(false)

  const navigate = (id: PageId) => {
    setActive(id)
    setMobileOpen(false)
  }

  return (
    <div className="flex min-h-screen bg-sand-50">
      <Sidebar active={active} onNavigate={navigate} />

      {/* Mobile sidebar drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div className="w-60 bg-white border-r border-charcoal-100 shadow-pop">
            <MobileSidebar active={active} onNavigate={navigate} />
          </div>
          <button
            className="flex-1 bg-charcoal-900/30 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation menu"
          />
        </div>
      )}

      <div className="flex flex-1 flex-col min-w-0">
        <TopNav onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-[1400px] w-full mx-auto">
          {active === 'overview' ? (
            <OverviewPage onNavigate={navigate} />
          ) : (
            <PlaceholderPage title={pageTitles[active]} />
          )}
        </main>
        <footer className="border-t border-charcoal-100 px-6 py-4 text-xs text-charcoal-400">
          AcoustiMap Restore · Prototype · Acoustic ecological recovery assessment · Not a measure of total biodiversity.
        </footer>
      </div>
    </div>
  )
}

function MobileSidebar({
  active,
  onNavigate,
}: {
  active: PageId
  onNavigate: (id: PageId) => void
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-forest-700 text-sand-50">
          <MapPin className="h-4.5 w-4.5" aria-hidden="true" />
        </div>
        <div className="leading-tight">
          <p className="font-display text-sm font-semibold text-charcoal-900">AcoustiMap</p>
          <p className="text-[10px] font-medium text-charcoal-400 tracking-wider uppercase">Restore</p>
        </div>
      </div>
      <nav className="flex flex-col gap-0.5 px-3 py-2" aria-label="Mobile navigation">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            aria-current={active === item.id ? 'page' : undefined}
            className={`flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active === item.id
                ? 'bg-forest-50 text-forest-800'
                : 'text-charcoal-500 hover:bg-sand-50'
            }`}
          >
            {item.label}
          </button>
        ))}
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
    </div>
  )
}
