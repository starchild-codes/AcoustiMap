import { useState } from 'react'
import { ChevronDown, Search, Bell, Menu } from 'lucide-react'
import { project } from '../data/mockData'

interface TopNavProps {
  onMenuClick: () => void
}

export default function TopNav({ onMenuClick }: TopNavProps) {
  const [projectOpen, setProjectOpen] = useState(false)
  const [periodOpen, setPeriodOpen] = useState(false)
  const [activePeriod, setActivePeriod] = useState(project.activePeriod)

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-forest-100 bg-white/85 backdrop-blur px-4 sm:px-6 py-3">
      <button
        onClick={onMenuClick}
        className="lg:hidden flex h-9 w-9 items-center justify-center rounded-lg text-forest-600 hover:bg-sand-100"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Project selector */}
      <div className="relative">
        <button
          onClick={() => setProjectOpen((v) => !v)}
          className="flex items-center gap-2 rounded-lg border border-forest-100 bg-white px-3 py-2 text-sm font-medium text-forest-800 hover:bg-sand-50"
        >
          <span className="hidden sm:inline text-forest-400">Project:</span>
          <span className="truncate max-w-[140px] sm:max-w-[220px]">{project.name}</span>
          <ChevronDown className="h-4 w-4 text-forest-400" />
        </button>
        {projectOpen && (
          <div className="absolute left-0 top-12 z-40 w-72 rounded-xl border border-forest-100 bg-white p-2 shadow-lg">
            <div className="px-3 py-2">
              <p className="text-sm font-semibold text-forest-900">{project.name}</p>
              <p className="text-xs text-forest-500">{project.location}</p>
            </div>
            <div className="mt-1 rounded-lg bg-sand-50 px-3 py-2 text-xs text-forest-500">
              Only one project available in this prototype.
            </div>
          </div>
        )}
      </div>

      {/* Monitoring period selector */}
      <div className="relative">
        <button
          onClick={() => setPeriodOpen((v) => !v)}
          className="flex items-center gap-2 rounded-lg border border-forest-100 bg-white px-3 py-2 text-sm font-medium text-forest-800 hover:bg-sand-50"
        >
          <span className="hidden sm:inline text-forest-400">Period:</span>
          <span>{activePeriod}</span>
          <ChevronDown className="h-4 w-4 text-forest-400" />
        </button>
        {periodOpen && (
          <div className="absolute left-0 top-12 z-40 w-40 rounded-xl border border-forest-100 bg-white p-1.5 shadow-lg">
            {project.monitoringPeriods.map((p) => (
              <button
                key={p}
                onClick={() => {
                  setActivePeriod(p)
                  setPeriodOpen(false)
                }}
                className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${
                  p === activePeriod
                    ? 'bg-forest-50 font-medium text-forest-800'
                    : 'text-forest-600 hover:bg-sand-50'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
        <button className="flex h-9 w-9 items-center justify-center rounded-lg text-forest-600 hover:bg-sand-100" aria-label="Search">
          <Search className="h-4.5 w-4.5" />
        </button>
        <button className="relative flex h-9 w-9 items-center justify-center rounded-lg text-forest-600 hover:bg-sand-100" aria-label="Notifications">
          <Bell className="h-4.5 w-4.5" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-forest-500" />
        </button>
        <button className="flex h-9 w-9 items-center justify-center rounded-full bg-forest-700 text-sand-50 text-xs font-semibold ring-2 ring-forest-200 hover:bg-forest-800" aria-label="Profile">
          DR
        </button>
      </div>
    </header>
  )
}
