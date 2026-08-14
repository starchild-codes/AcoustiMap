import { Calendar, ChevronDown, MapPin, Menu } from 'lucide-react'
import type { Project } from '../api/projects'

interface TopNavProps {
  project: Project | null
  onMenuClick: () => void
  onProjectsClick: () => void
}

export default function TopNav({ project, onMenuClick, onProjectsClick }: TopNavProps) {
  const location = project ? [project.region, project.country].filter(Boolean).join(', ') : ''
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-charcoal-100 bg-white/95 px-4 backdrop-blur sm:px-6">
      <button onClick={onMenuClick} className="lg:hidden rounded-md p-2 text-charcoal-500" aria-label="Open navigation">
        <Menu className="h-5 w-5" />
      </button>
      <button onClick={onProjectsClick} className="flex min-w-0 items-center gap-3 text-left">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-forest-50 text-forest-700">
          <MapPin className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-charcoal-900">{project?.name ?? 'Select a project'}</p>
          <p className="truncate text-xs text-charcoal-400">{location || 'Open Projects to begin'}</p>
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-charcoal-400" />
      </button>
      <div className="hidden items-center gap-2 text-xs text-charcoal-500 sm:flex">
        <Calendar className="h-4 w-4" />
        {project?.monitoring_start
          ? `${project.monitoring_start} — ${project.monitoring_end || 'ongoing'}`
          : 'No monitoring dates configured'}
      </div>
    </header>
  )
}
