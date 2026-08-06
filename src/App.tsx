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

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-64 bg-white border-r border-forest-100 shadow-xl">
            <MobileSidebar active={active} onNavigate={navigate} />
          </div>
          <div
            className="flex-1 bg-forest-900/30 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
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
        <footer className="border-t border-forest-100 px-6 py-4 text-xs text-forest-400">
          AcoustiMap Restore · Prototype · Acoustic ecological recovery assessment · Not a measure of total biodiversity.
        </footer>
      </div>
    </div>
  )
}

// Mobile sidebar reuses nav items inline (kept simple for small screens)
function MobileSidebar({
  active,
  onNavigate,
}: {
  active: PageId
  onNavigate: (id: PageId) => void
}) {
  const nav: { id: PageId; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'soundscape', label: 'Soundscape Comparison' },
    { id: 'recordings', label: 'Recording Explorer' },
    { id: 'projects', label: 'Projects' },
    { id: 'methodology', label: 'Methodology' },
    { id: 'reports', label: 'Reports' },
    { id: 'settings', label: 'Settings' },
  ]
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-700 text-sand-50">
          <MapPin className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <p className="font-display text-base font-semibold text-forest-900">AcoustiMap</p>
          <p className="text-xs font-medium text-forest-500 tracking-wide uppercase">Restore</p>
        </div>
      </div>
      <nav className="flex flex-col gap-1 px-3">
        {nav.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex items-center rounded-xl px-3 py-2.5 text-sm font-medium ${
              active === item.id
                ? 'bg-forest-50 text-forest-800 ring-1 ring-forest-200'
                : 'text-forest-600 hover:bg-sand-50'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
