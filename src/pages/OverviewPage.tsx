import { useEffect, useState } from 'react'
import { ArrowRight, CircleAlert, Database, FolderOpen, Loader2, TrendingUp } from 'lucide-react'
import type { PageId } from '../components/Sidebar'
import { listRecordings, type Recording } from '../api/recordings'
import { getProjectSummary, listAnalysisJobs, type AnalysisJob, type ProjectSummary } from '../api/analysis'

interface OverviewPageProps {
  onNavigate: (id: PageId) => void
  projectId: string | null
}

export default function OverviewPage({ onNavigate, projectId }: OverviewPageProps) {
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [jobs, setJobs] = useState<AnalysisJob[]>([])
  const [summary, setSummary] = useState<ProjectSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!projectId) return
    setLoading(true)
    setError(null)
    Promise.all([listRecordings(projectId), listAnalysisJobs(projectId), getProjectSummary(projectId)])
      .then(([nextRecordings, nextJobs, nextSummary]) => {
        setRecordings(nextRecordings)
        setJobs(nextJobs)
        setSummary(nextSummary)
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load project results'))
      .finally(() => setLoading(false))
  }, [projectId])

  if (!projectId) {
    return <EmptyState title="Select a restoration project" text="Create or open a project, upload reference and restoration recordings, then run the real acoustic analysis." action="Open Projects" onClick={() => onNavigate('projects')} />
  }
  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-7 w-7 animate-spin text-forest-600" /></div>
  if (error) return <EmptyState title="Project data unavailable" text={error} action="Open project workspace" onClick={() => onNavigate('soundscape')} />

  const latestJob = jobs[0]
  const temporal = summary?.temporal_result as { sufficient?: boolean; direction?: string; slope_points_per_year?: number; message?: string } | undefined
  const excluded = summary?.excluded_recording_ids.length ?? 0

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-forest-700">Live backend results</p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-charcoal-900">Restoration overview</h1>
          <p className="mt-2 max-w-3xl text-sm text-charcoal-600">Reference-based acoustic evidence of change. It does not identify species, infer abundance, prove biodiversity change, or establish causation.</p>
        </div>
        <button onClick={() => onNavigate('soundscape')} className="inline-flex items-center gap-2 rounded-lg bg-forest-700 px-4 py-2 text-sm font-medium text-white hover:bg-forest-800">
          Open project workspace <ArrowRight className="h-4 w-4" />
        </button>
      </header>

      {!summary ? (
        <EmptyState
          title={recordings.length ? 'No completed project analysis yet' : 'Upload recordings to begin'}
          text={latestJob?.state === 'failed' ? latestJob.error_summary : 'The overview stays empty until the backend has produced a real result.'}
          action="Continue setup"
          onClick={() => onNavigate('soundscape')}
        />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <ResultCard label="Acoustic recovery score" value={summary.recovery_score == null ? 'Unavailable' : `${summary.recovery_score.toFixed(1)} / 100`} detail="Position between local degraded and healthy acoustic references" />
            <ResultCard label="Bootstrap interval" value={summary.bootstrap_ci_low == null ? 'Unavailable' : `${summary.bootstrap_ci_low.toFixed(1)}–${summary.bootstrap_ci_high?.toFixed(1)}`} detail={`${summary.bootstrap_iterations}/${summary.bootstrap_requested_iterations} successful/requested iterations`} />
            <ResultCard label="Evidence confidence" value={summary.confidence_label || 'Not rated'} detail={summary.confidence_reasons[0] || 'See project warnings and exclusions'} />
            <ResultCard label="Recordings" value={`${recordings.length}`} detail={`${summary.included_recording_ids.length} restoration included · ${excluded} excluded`} />
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="card p-5">
              <div className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-forest-600" /><h2 className="section-title">Temporal momentum</h2></div>
              <p className="mt-3 text-xl font-semibold text-charcoal-900">{temporal?.sufficient ? temporal.direction : 'Insufficient longitudinal evidence'}</p>
              <p className="mt-1 text-sm text-charcoal-600">{temporal?.sufficient && temporal.slope_points_per_year != null ? `${temporal.slope_points_per_year.toFixed(2)} recovery-score points per year` : temporal?.message || 'At least three valid, chronologically dated restoration periods are required.'}</p>
            </div>
            <div className="card p-5">
              <div className="flex items-center gap-2"><CircleAlert className="h-5 w-5 text-amber-600" /><h2 className="section-title">Warnings and limitations</h2></div>
              <ul className="mt-3 space-y-2 text-sm text-charcoal-600">
                {(summary.warnings.length ? summary.warnings : ['No pipeline warnings were recorded for this run.']).map((warning) => <li key={warning}>• {warning}</li>)}
                <li>• Bootstrap bounds describe internal resampling variability, not causal certainty.</li>
              </ul>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function ResultCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="card p-5"><p className="text-xs font-medium uppercase tracking-wide text-charcoal-400">{label}</p><p className="mt-2 text-2xl font-semibold text-charcoal-900">{value}</p><p className="mt-2 text-xs leading-relaxed text-charcoal-500">{detail}</p></div>
}

function EmptyState({ title, text, action, onClick }: { title: string; text: string; action: string; onClick: () => void }) {
  return <div className="card p-10 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-forest-50 text-forest-700"><FolderOpen className="h-7 w-7" /></div><h2 className="mt-4 font-display text-xl font-semibold text-charcoal-900">{title}</h2><p className="mx-auto mt-2 max-w-xl text-sm text-charcoal-500">{text}</p><button onClick={onClick} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-forest-700 px-4 py-2 text-sm font-medium text-white">{action}<Database className="h-4 w-4" /></button></div>
}
