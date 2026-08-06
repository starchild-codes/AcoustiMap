import { useState, useEffect, useCallback } from 'react'
import { FolderOpen, Plus, Search, MapPin, Calendar, Trash2, Pencil, Copy, Archive, ArrowRight, X, CircleAlert as AlertCircle, Loader as Loader2 } from 'lucide-react'
import { listProjects, createProject, updateProject, deleteProject, type Project, type ProjectCreate } from '../api/projects'
import { ApiError } from '../api/client'
import type { PageId } from '../components/Sidebar'

interface ProjectsPageProps {
  onNavigate: (id: PageId) => void
}

export default function ProjectsPage({ onNavigate }: ProjectsPageProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showCreate, setShowCreate] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Project | null>(null)

  const fetchProjects = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listProjects(search || undefined, statusFilter !== 'all' ? statusFilter : undefined)
      setProjects(data)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail)
      } else {
        setError('Could not load projects. Is the backend running?')
      }
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const handleCreate = async (data: ProjectCreate) => {
    try {
      await createProject(data)
      setShowCreate(false)
      fetchProjects()
    } catch (err) {
      if (err instanceof ApiError) setError(err.detail)
    }
  }

  const handleUpdate = async (id: string, data: Partial<ProjectCreate>) => {
    try {
      await updateProject(id, data)
      setEditingProject(null)
      fetchProjects()
    } catch (err) {
      if (err instanceof ApiError) setError(err.detail)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteProject(id)
      setConfirmDelete(null)
      fetchProjects()
    } catch (err) {
      if (err instanceof ApiError) setError(err.detail)
    }
  }

  const handleDuplicate = async (p: Project) => {
    try {
      await createProject({
        name: `${p.name} (copy)`,
        description: p.description,
        ecosystem_type: p.ecosystem_type,
        country: p.country,
        region: p.region,
        latitude: p.latitude ?? undefined,
        longitude: p.longitude ?? undefined,
        restoration_intervention: p.restoration_intervention,
        organisation: p.organisation,
      })
      fetchProjects()
    } catch (err) {
      if (err instanceof ApiError) setError(err.detail)
    }
  }

  const handleArchive = async (p: Project) => {
    try {
      await updateProject(p.id, { status: 'archived' })
      fetchProjects()
    } catch (err) {
      if (err instanceof ApiError) setError(err.detail)
    }
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-sand-100 text-charcoal-700 ring-sand-300',
    configuring: 'bg-ocean-50 text-ocean-700 ring-ocean-200',
    monitoring: 'bg-forest-50 text-forest-700 ring-forest-200',
    analysis_ready: 'bg-forest-50 text-forest-700 ring-forest-200',
    review_required: 'bg-amber-50 text-amber-700 ring-amber-200',
    archived: 'bg-charcoal-50 text-charcoal-500 ring-charcoal-200',
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-charcoal-900 tracking-tight">
              Projects
            </h1>
            <p className="mt-1.5 text-sm text-charcoal-600">
              Manage restoration projects, monitoring sites, and analysis configurations.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-forest-700 px-4 py-2 text-sm font-medium text-sand-50 hover:bg-forest-800 transition-colors focus-visible:ring-2 focus-visible:ring-forest-500 focus-visible:ring-offset-2"
          >
            <Plus className="h-4 w-4" />
            New Project
          </button>
        </div>
      </header>

      {error && (
        <div className="card p-4 border-rose-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-rose-800">Error</p>
              <p className="text-xs text-rose-700 mt-1">{error}</p>
              <p className="text-xs text-charcoal-400 mt-2">
                The backend API runs on port 8001. Start it with <code className="text-charcoal-600">cd backend && uvicorn app.main:app --port 8001</code>
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal-400" />
            <input
              type="text"
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-charcoal-200 bg-white pl-9 pr-3 py-2 text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-charcoal-200 bg-white px-3 py-2 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="configuring">Configuring</option>
            <option value="monitoring">Monitoring</option>
            <option value="analysis_ready">Analysis ready</option>
            <option value="review_required">Review required</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-forest-600" />
        </div>
      ) : projects.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-forest-50 text-forest-600 ring-1 ring-forest-200">
            <FolderOpen className="h-8 w-8" />
          </div>
          <h2 className="mt-5 font-display text-xl font-semibold text-charcoal-900">No projects yet</h2>
          <p className="mt-2 text-sm text-charcoal-500 max-w-sm mx-auto">
            Create your first restoration project to start uploading recordings and running analysis.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-forest-700 px-4 py-2 text-sm font-medium text-sand-50 hover:bg-forest-800 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((p) => (
            <div key={p.id} className="card card-hover p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-forest-50 text-forest-600">
                    <FolderOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-charcoal-900">{p.name}</h3>
                    {p.is_demo && (
                      <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full">Demonstration</span>
                    )}
                  </div>
                </div>
                <span className={`pill ring-1 ${statusColors[p.status] || statusColors.draft} text-[10px]`}>
                  {p.status.replace('_', ' ')}
                </span>
              </div>

              <p className="text-xs text-charcoal-500 line-clamp-2">{p.description || 'No description'}</p>

              <div className="flex flex-col gap-1 text-xs text-charcoal-400">
                {p.region && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3 w-3" />
                    {p.region}, {p.country}
                  </span>
                )}
                {p.monitoring_start && (
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" />
                    {p.monitoring_start} — {p.monitoring_end || 'ongoing'}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 mt-auto pt-2 border-t border-charcoal-50">
                <button
                  onClick={() => onNavigate('soundscape')}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-forest-700 hover:bg-forest-50 transition-colors"
                >
                  Open <ArrowRight className="h-3 w-3" />
                </button>
                <button
                  onClick={() => setEditingProject(p)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-charcoal-400 hover:bg-sand-100 transition-colors"
                  aria-label="Edit project"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDuplicate(p)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-charcoal-400 hover:bg-sand-100 transition-colors"
                  aria-label="Duplicate project"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleArchive(p)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-charcoal-400 hover:bg-sand-100 transition-colors"
                  aria-label="Archive project"
                >
                  <Archive className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setConfirmDelete(p)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-charcoal-400 hover:bg-rose-50 hover:text-rose-600 transition-colors ml-auto"
                  aria-label="Delete project"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <ProjectFormModal
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreate}
        />
      )}

      {editingProject && (
        <ProjectFormModal
          project={editingProject}
          onClose={() => setEditingProject(null)}
          onSubmit={(data) => handleUpdate(editingProject.id, data)}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal-900/30 backdrop-blur-sm">
          <div className="card p-6 max-w-md w-full mx-4">
            <h3 className="font-display text-lg font-semibold text-charcoal-900">Delete project?</h3>
            <p className="mt-2 text-sm text-charcoal-600">
              This will permanently delete "{confirmDelete.name}" and all associated recordings, sites, and analysis results. This cannot be undone.
            </p>
            <div className="mt-4 flex gap-2 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="rounded-lg border border-charcoal-200 px-3 py-1.5 text-sm font-medium text-charcoal-600 hover:bg-sand-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete.id)}
                className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700 transition-colors"
              >
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ProjectFormModal({
  project,
  onClose,
  onSubmit,
}: {
  project?: Project
  onClose: () => void
  onSubmit: (data: ProjectCreate) => void
}) {
  const [form, setForm] = useState<ProjectCreate>({
    name: project?.name ?? '',
    description: project?.description ?? '',
    ecosystem_type: project?.ecosystem_type ?? '',
    country: project?.country ?? '',
    region: project?.region ?? '',
    latitude: project?.latitude ?? undefined,
    longitude: project?.longitude ?? undefined,
    restoration_intervention: project?.restoration_intervention ?? '',
    intervention_date: project?.intervention_date ?? undefined,
    monitoring_start: project?.monitoring_start ?? undefined,
    monitoring_end: project?.monitoring_end ?? undefined,
    status: project?.status ?? 'draft',
    privacy: project?.privacy ?? 'private',
    organisation: project?.organisation ?? '',
    primary_contact: project?.primary_contact ?? '',
    scientific_notes: project?.scientific_notes ?? '',
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal-900/30 backdrop-blur-sm">
      <div className="card p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-semibold text-charcoal-900">
            {project ? 'Edit Project' : 'New Project'}
          </h3>
          <button onClick={onClose} className="text-charcoal-400 hover:text-charcoal-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-charcoal-500">Project name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 w-full rounded-md border border-charcoal-200 bg-white px-3 py-2 text-sm"
              placeholder="e.g. Mars Coral Reef Restoration"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-charcoal-500">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mt-1 w-full rounded-md border border-charcoal-200 bg-white px-3 py-2 text-sm"
              rows={2}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-charcoal-500">Ecosystem type</label>
            <input
              type="text"
              value={form.ecosystem_type}
              onChange={(e) => setForm({ ...form, ecosystem_type: e.target.value })}
              className="mt-1 w-full rounded-md border border-charcoal-200 bg-white px-3 py-2 text-sm"
              placeholder="e.g. Coral reef"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-charcoal-500">Country</label>
            <input
              type="text"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              className="mt-1 w-full rounded-md border border-charcoal-200 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-charcoal-500">Region</label>
            <input
              type="text"
              value={form.region}
              onChange={(e) => setForm({ ...form, region: e.target.value })}
              className="mt-1 w-full rounded-md border border-charcoal-200 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-charcoal-500">Organisation</label>
            <input
              type="text"
              value={form.organisation ?? ''}
              onChange={(e) => setForm({ ...form, organisation: e.target.value })}
              className="mt-1 w-full rounded-md border border-charcoal-200 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-charcoal-500">Latitude</label>
            <input
              type="number"
              step="any"
              value={form.latitude ?? ''}
              onChange={(e) => setForm({ ...form, latitude: e.target.value ? Number(e.target.value) : undefined })}
              className="mt-1 w-full rounded-md border border-charcoal-200 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-charcoal-500">Longitude</label>
            <input
              type="number"
              step="any"
              value={form.longitude ?? ''}
              onChange={(e) => setForm({ ...form, longitude: e.target.value ? Number(e.target.value) : undefined })}
              className="mt-1 w-full rounded-md border border-charcoal-200 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-charcoal-500">Restoration intervention</label>
            <input
              type="text"
              value={form.restoration_intervention}
              onChange={(e) => setForm({ ...form, restoration_intervention: e.target.value })}
              className="mt-1 w-full rounded-md border border-charcoal-200 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-charcoal-500">Intervention date</label>
            <input
              type="date"
              value={form.intervention_date ?? ''}
              onChange={(e) => setForm({ ...form, intervention_date: e.target.value || undefined })}
              className="mt-1 w-full rounded-md border border-charcoal-200 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-charcoal-500">Monitoring start</label>
            <input
              type="date"
              value={form.monitoring_start ?? ''}
              onChange={(e) => setForm({ ...form, monitoring_start: e.target.value || undefined })}
              className="mt-1 w-full rounded-md border border-charcoal-200 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-charcoal-500">Monitoring end</label>
            <input
              type="date"
              value={form.monitoring_end ?? ''}
              onChange={(e) => setForm({ ...form, monitoring_end: e.target.value || undefined })}
              className="mt-1 w-full rounded-md border border-charcoal-200 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-charcoal-500">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="mt-1 w-full rounded-md border border-charcoal-200 bg-white px-3 py-2 text-sm"
            >
              <option value="draft">Draft</option>
              <option value="configuring">Configuring</option>
              <option value="monitoring">Monitoring</option>
              <option value="analysis_ready">Analysis ready</option>
              <option value="review_required">Review required</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-charcoal-500">Privacy</label>
            <select
              value={form.privacy}
              onChange={(e) => setForm({ ...form, privacy: e.target.value })}
              className="mt-1 w-full rounded-md border border-charcoal-200 bg-white px-3 py-2 text-sm"
            >
              <option value="private">Private</option>
              <option value="public">Public demonstration</option>
              <option value="sensitive">Sensitive location</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-charcoal-500">Scientific notes</label>
            <textarea
              value={form.scientific_notes}
              onChange={(e) => setForm({ ...form, scientific_notes: e.target.value })}
              className="mt-1 w-full rounded-md border border-charcoal-200 bg-white px-3 py-2 text-sm"
              rows={2}
            />
          </div>
        </div>

        <div className="mt-4 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="rounded-lg border border-charcoal-200 px-4 py-2 text-sm font-medium text-charcoal-600 hover:bg-sand-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => form.name && onSubmit(form)}
            disabled={!form.name}
            className="rounded-lg bg-forest-700 px-4 py-2 text-sm font-medium text-sand-50 hover:bg-forest-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {project ? 'Save changes' : 'Create project'}
          </button>
        </div>
      </div>
    </div>
  )
}
