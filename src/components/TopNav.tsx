import { useState } from 'react'
import { ChevronDown, Bell, Menu, MapPin, Calendar } from 'lucide-react'
import { project } from '../data/mockData'

interface TopNavProps {
  onMenuClick: () => void
}

export default function TopNav({ onMenuClick }: TopNavProps) {
  const [projectOpen, setProjectOpen] = useState(false)
  const [periodOpen, setPeriodOpen] = useState(false)
  const [activePeriod, setActivePeriod] = useState(project.activePeriod)

  return (
    <header className="sticky top-0 z-30 border-b border-charcoal-100 bg-white/90 backdrop-blur-sm">
      <div className="flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden flex h-9 w-9 items-center justify-center rounded-lg text-charcoal-500 hover:bg-sand-100"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Project selector — most prominent */}
        <div className="relative">
          <button
            onClick={() => setProjectOpen((v) => !v)}
            className="flex items-center gap-2.5 rounded-lg border border-charcoal-200 bg-white px-3 py-2 text-sm font-semibold text-charcoal-900 hover:border-forest-300 hover:bg-forest-50/40 transition-colors"
            aria-label={`Project: ${project.name}`}
            aria-expanded={projectOpen}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-forest-700 text-sand-50 shrink-0">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="flex flex-col items-start leading-tight">
              <span className="truncate max-w-[120px] sm:max-w-[200px]">{project.name}</span>
              <span className="hidden sm:inline text-[10px] font-normal text-charcoal-400">
                {project.location}
              </span>
            </span>
            <ChevronDown className="h-4 w-4 text-charcoal-400" aria-hidden="true" />
          </button>
          {projectOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setProjectOpen(false)} aria-hidden="true" />
              <div className="absolute left-0 top-14 z-50 w-72 rounded-xl border border-charcoal-100 bg-white p-2 shadow-pop">
                <div className="px-3 py-2">
                  <p className="text-sm font-semibold text-charcoal-900">{project.name}</p>
                  <p className="text-xs text-charcoal-500">{project.location}</p>
                </div>
                <div className="mt-1 rounded-lg bg-sand-50 px-3 py-2 text-xs text-charcoal-500">
                  Only one project available in this prototype.
                </div>
              </div>
            </>
          )}
        </div>

        {/* Monitoring period selector */}
        <div className="relative">
          <button
            onClick={() => setPeriodOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg border border-charcoal-100 bg-white px-2.5 py-2 text-sm font-medium text-charcoal-700 hover:bg-sand-50 transition-colors"
            aria-label={`Monitoring period: ${activePeriod}`}
            aria-expanded={periodOpen}
          >
            <Calendar className="h-4 w-4 text-charcoal-400" aria-hidden="true" />
            <span className="hidden md:inline">{activePeriod}</span>
            <ChevronDown className="h-3.5 w-3.5 text-charcoal-400" aria-hidden="true" />
          </button>
          {periodOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setPeriodOpen(false)} aria-hidden="true" />
              <div className="absolute left-0 top-14 z-50 w-40 rounded-xl border border-charcoal-100 bg-white p-1.5 shadow-pop">
                {project.monitoringPeriods.map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setActivePeriod(p)
                      setPeriodOpen(false)
                    }}
                    className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      p === activePeriod
                        ? 'bg-forest-50 font-medium text-forest-800'
                        : 'text-charcoal-600 hover:bg-sand-50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <button
            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-charcoal-500 hover:bg-sand-100 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-4.5 w-4.5" aria-hidden="true" />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-forest-500" />
          </button>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full bg-forest-700 text-sand-50 text-xs font-semibold hover:bg-forest-800 transition-colors"
            aria-label="User profile: DR"
          >
            DR
          </button>
        </div>
      </div>
    </header>
  )
}
