import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, BarChart3, CheckCircle2, Download, FileAudio, FolderOpen, Loader2, Play, Plus, RefreshCw, Settings2, Upload } from 'lucide-react'
import { getProject, type Project } from '../api/projects'
import { createSite, listSites, type Site } from '../api/sites'
import { deleteRecording, listRecordings, recordingAudioUrl, updateRecording, uploadRecording, type Recording } from '../api/recordings'
import { createConfiguration, listConfigurations, type AnalysisConfig } from '../api/configurations'
import { artifactUrl, cancelJob, createAnalysisJob, createManualReview, getAnalysisJob, getProjectSummary, listAnalysisJobs, listJobResults, retryJob, type AnalysisJob, type ProjectSummary, type RecordingAnalysis } from '../api/analysis'
import { exportProjectJson, exportRecordingsCsv, exportReproducibleBundle } from '../api/exports'
import { ApiError } from '../api/client'

type Tab = 'setup' | 'recordings' | 'analysis' | 'results'
const TERMINAL_STATES = new Set(['completed', 'completed_with_warnings', 'failed', 'cancelled'])

export default function SoundscapePage({ projectId, onChooseProject }: { projectId: string | null; onChooseProject: () => void }) {
  const [project, setProject] = useState<Project | null>(null)
  const [sites, setSites] = useState<Site[]>([])
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [configs, setConfigs] = useState<AnalysisConfig[]>([])
  const [jobs, setJobs] = useState<AnalysisJob[]>([])
  const [summary, setSummary] = useState<ProjectSummary | null>(null)
  const [results, setResults] = useState<RecordingAnalysis[]>([])
  const [activeJob, setActiveJob] = useState<AnalysisJob | null>(null)
  const [tab, setTab] = useState<Tab>('setup')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    setError(null)
    try {
      const [nextProject, nextSites, nextRecordings, nextConfigs, nextJobs, nextSummary] = await Promise.all([
        getProject(projectId), listSites(projectId), listRecordings(projectId), listConfigurations(projectId), listAnalysisJobs(projectId), getProjectSummary(projectId),
      ])
      setProject(nextProject); setSites(nextSites); setRecordings(nextRecordings); setConfigs(nextConfigs); setJobs(nextJobs); setSummary(nextSummary)
      const latest = nextJobs[0] ?? null
      setActiveJob(latest)
      if (latest && ['completed', 'completed_with_warnings'].includes(latest.state)) setResults(await listJobResults(latest.id))
      else setResults([])
    } catch (err) {
      setError(messageFrom(err))
    } finally { setLoading(false) }
  }, [projectId])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (!activeJob || TERMINAL_STATES.has(activeJob.state)) return
    const timer = window.setInterval(async () => {
      try {
        const next = await getAnalysisJob(activeJob.id)
        setActiveJob(next)
        setJobs((current) => [next, ...current.filter((job) => job.id !== next.id)])
        if (TERMINAL_STATES.has(next.state)) {
          if (['completed', 'completed_with_warnings'].includes(next.state)) {
            const [nextResults, nextSummary] = await Promise.all([listJobResults(next.id), getProjectSummary(next.project_id)])
            setResults(nextResults); setSummary(nextSummary); setTab('results')
          }
        }
      } catch (err) { setError(messageFrom(err)) }
    }, 750)
    return () => window.clearInterval(timer)
  }, [activeJob])

  if (!projectId) return <ChooseProject onClick={onChooseProject} />
  if (loading && !project) return <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-forest-600" /></div>
  if (!project) return <ChooseProject onClick={onChooseProject} text={error || 'This project could not be loaded.'} />

  const roleCounts = countRoles(recordings)
  const restorationPeriods = new Set(recordings.filter((r) => r.habitat_category === 'restored' && r.timestamp && r.monitoring_period).map((r) => r.monitoring_period)).size
  const analysisReady = roleCounts.healthy >= 3 && roleCounts.degraded >= 3 && roleCounts.restored >= 1 && configs.length > 0

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-xs font-medium uppercase tracking-wide text-forest-700">API-backed project workspace</p>
        <h1 className="mt-1 font-display text-3xl font-semibold text-charcoal-900">{project.name}</h1>
        <p className="mt-2 max-w-3xl text-sm text-charcoal-600">Upload and label recordings, run the Python analysis worker, and inspect traceable acoustic evidence. Scores are local reference-based proxies—not biodiversity or causal claims.</p>
      </header>

      {error && <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{error}<button onClick={() => setError(null)} className="ml-auto">×</button></div>}

      <nav className="flex flex-wrap gap-1 rounded-lg border border-charcoal-100 bg-white p-1">
        {(['setup', 'recordings', 'analysis', 'results'] as Tab[]).map((item) => <button key={item} onClick={() => setTab(item)} className={`rounded-md px-4 py-2 text-sm font-medium capitalize ${tab === item ? 'bg-forest-50 text-forest-800' : 'text-charcoal-500 hover:bg-sand-50'}`}>{item}</button>)}
      </nav>

      {tab === 'setup' && <SetupTab project={project} sites={sites} roleCounts={roleCounts} periods={restorationPeriods} onSiteCreated={async (name, siteType) => { await createSite(project.id, { name, site_type: siteType }); await load() }} onContinue={() => setTab('recordings')} />}
      {tab === 'recordings' && <RecordingsTab projectId={project.id} sites={sites} recordings={recordings} onChanged={load} onError={(err) => setError(messageFrom(err))} />}
      {tab === 'analysis' && <AnalysisTab projectId={project.id} configs={configs} recordings={recordings} roleCounts={roleCounts} ready={analysisReady} activeJob={activeJob} jobs={jobs} onConfigCreated={load} onJob={(job) => { setActiveJob(job); setJobs((current) => [job, ...current]); }} onError={(err) => setError(messageFrom(err))} />}
      {tab === 'results' && <ResultsTab projectId={project.id} recordings={recordings} results={results} summary={summary} job={activeJob} onChanged={load} onError={(err) => setError(messageFrom(err))} />}
    </div>
  )
}

function SetupTab({ project, sites, roleCounts, periods, onSiteCreated, onContinue }: { project: Project; sites: Site[]; roleCounts: Record<string, number>; periods: number; onSiteCreated: (name: string, type: 'healthy' | 'degraded' | 'restored') => Promise<void>; onContinue: () => void }) {
  const [name, setName] = useState('')
  const [type, setType] = useState<'healthy' | 'degraded' | 'restored'>('restored')
  const checks = [
    [`Healthy references: ${roleCounts.healthy}/3`, roleCounts.healthy >= 3],
    [`Degraded references: ${roleCounts.degraded}/3`, roleCounts.degraded >= 3],
    [`Restoration recordings: ${roleCounts.restored}/1`, roleCounts.restored >= 1],
    [`Chronological restoration periods: ${periods}/3`, periods >= 3],
  ] as const
  return <div className="grid gap-5 lg:grid-cols-2">
    <section className="card p-5"><h2 className="section-title">Project setup</h2><dl className="mt-4 grid gap-3 text-sm"><div><dt className="text-charcoal-400">Ecosystem</dt><dd className="font-medium text-charcoal-800">{project.ecosystem_type || 'Not specified'}</dd></div><div><dt className="text-charcoal-400">Monitoring</dt><dd className="font-medium text-charcoal-800">{project.monitoring_start || 'Not set'} — {project.monitoring_end || 'ongoing'}</dd></div><div><dt className="text-charcoal-400">Sites</dt><dd className="font-medium text-charcoal-800">{sites.length}</dd></div></dl><button onClick={onContinue} className="mt-5 rounded-lg bg-forest-700 px-4 py-2 text-sm font-medium text-white">Upload recordings</button></section>
    <section className="card p-5"><h2 className="section-title">Analysis readiness</h2><div className="mt-4 space-y-2">{checks.map(([label, ok]) => <div key={label} className="flex items-center gap-2 text-sm"><CheckCircle2 className={`h-4 w-4 ${ok ? 'text-forest-600' : 'text-charcoal-300'}`} /><span className={ok ? 'text-charcoal-700' : 'text-charcoal-500'}>{label}</span></div>)}</div><p className="mt-4 text-xs text-charcoal-500">Recovery scoring requires the reference counts above. Momentum is shown only with at least three valid dated periods.</p></section>
    <section className="card p-5 lg:col-span-2"><h2 className="section-title">Add monitoring site</h2><div className="mt-3 flex flex-wrap gap-2"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Site name" className="min-w-52 flex-1 rounded-lg border border-charcoal-200 px-3 py-2 text-sm" /><select value={type} onChange={(e) => setType(e.target.value as typeof type)} className="rounded-lg border border-charcoal-200 px-3 py-2 text-sm"><option value="healthy">Healthy reference</option><option value="degraded">Degraded reference</option><option value="restored">Restoration</option></select><button disabled={!name} onClick={async () => { await onSiteCreated(name, type); setName('') }} className="inline-flex items-center gap-1 rounded-lg bg-charcoal-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"><Plus className="h-4 w-4" />Add site</button></div></section>
  </div>
}

function RecordingsTab({ projectId, sites, recordings, onChanged, onError }: { projectId: string; sites: Site[]; recordings: Recording[]; onChanged: () => Promise<void>; onError: (err: unknown) => void }) {
  const [files, setFiles] = useState<File[]>([])
  const [role, setRole] = useState<'healthy' | 'degraded' | 'restored'>('restored')
  const [siteId, setSiteId] = useState('')
  const [timestamp, setTimestamp] = useState('')
  const [period, setPeriod] = useState('')
  const [recorderId, setRecorderId] = useState('')
  const [uploading, setUploading] = useState(false)
  const submit = async () => {
    setUploading(true)
    try {
      for (const file of files) await uploadRecording(projectId, file, { habitat_category: role, site_id: siteId || undefined, timestamp: timestamp ? new Date(timestamp).toISOString() : undefined, monitoring_period: period, recorder_id: recorderId })
      setFiles([]); await onChanged()
    } catch (err) { onError(err) } finally { setUploading(false) }
  }
  return <div className="space-y-5">
    <section className="card p-5"><h2 className="section-title">Upload real audio</h2><p className="mt-1 text-xs text-charcoal-500">WAV, FLAC, MP3, M4A, or OGG. Files are stored by the backend and analyzed by the Python worker.</p><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3"><input type="file" multiple accept="audio/*,.flac" onChange={(e) => setFiles(Array.from(e.target.files || []))} className="rounded-lg border border-charcoal-200 p-2 text-sm" /><select value={role} onChange={(e) => setRole(e.target.value as typeof role)} className="rounded-lg border border-charcoal-200 px-3 py-2 text-sm"><option value="healthy">Healthy reference</option><option value="degraded">Degraded reference</option><option value="restored">Restoration / monitored</option></select><select value={siteId} onChange={(e) => setSiteId(e.target.value)} className="rounded-lg border border-charcoal-200 px-3 py-2 text-sm"><option value="">No site</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</select><input type="datetime-local" value={timestamp} onChange={(e) => setTimestamp(e.target.value)} className="rounded-lg border border-charcoal-200 px-3 py-2 text-sm" /><input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="Monitoring period (e.g. 2026-01)" className="rounded-lg border border-charcoal-200 px-3 py-2 text-sm" /><input value={recorderId} onChange={(e) => setRecorderId(e.target.value)} placeholder="Recorder ID (optional)" className="rounded-lg border border-charcoal-200 px-3 py-2 text-sm" /></div><button disabled={!files.length || !timestamp || !period || uploading} onClick={submit} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-forest-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-40">{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}Upload {files.length || ''} recording{files.length === 1 ? '' : 's'}</button></section>
    <section className="space-y-3"><div className="flex items-center justify-between"><h2 className="section-title">Backend recordings ({recordings.length})</h2><button onClick={() => void onChanged()} className="text-charcoal-500"><RefreshCw className="h-4 w-4" /></button></div>{recordings.length ? recordings.map((recording) => <RecordingEditor key={recording.id} recording={recording} sites={sites} onSaved={onChanged} onError={onError} />) : <div className="card p-8 text-center text-sm text-charcoal-500">No recordings uploaded.</div>}</section>
  </div>
}

function RecordingEditor({ recording, sites, onSaved, onError }: { recording: Recording; sites: Site[]; onSaved: () => Promise<void>; onError: (err: unknown) => void }) {
  const [role, setRole] = useState(recording.habitat_category)
  const [siteId, setSiteId] = useState(recording.site_id || '')
  const [timestamp, setTimestamp] = useState(recording.timestamp?.slice(0, 16) || '')
  const [period, setPeriod] = useState(recording.monitoring_period)
  const [recorderId, setRecorderId] = useState(recording.recorder_id)
  return <div className="card p-4"><div className="flex flex-wrap items-center gap-3"><FileAudio className="h-5 w-5 text-ocean-600" /><div className="min-w-44 flex-1"><p className="truncate text-sm font-medium text-charcoal-800">{recording.filename}</p><p className="text-[11px] text-charcoal-400">{(recording.file_size / 1024 / 1024).toFixed(2)} MB · {recording.id}</p></div><select value={role} onChange={(e) => setRole(e.target.value as typeof role)} className="rounded-md border border-charcoal-200 p-1.5 text-xs"><option value="healthy">Healthy reference</option><option value="degraded">Degraded reference</option><option value="restored">Restoration</option></select><select value={siteId} onChange={(e) => setSiteId(e.target.value)} className="rounded-md border border-charcoal-200 p-1.5 text-xs"><option value="">No site</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</select><input type="datetime-local" value={timestamp} onChange={(e) => setTimestamp(e.target.value)} className="rounded-md border border-charcoal-200 p-1.5 text-xs" /><input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="Period" className="w-28 rounded-md border border-charcoal-200 p-1.5 text-xs" /><input value={recorderId} onChange={(e) => setRecorderId(e.target.value)} placeholder="Recorder" className="w-28 rounded-md border border-charcoal-200 p-1.5 text-xs" /><button onClick={async () => { try { await updateRecording(recording.id, { habitat_category: role, site_id: siteId || null, timestamp: timestamp ? new Date(timestamp).toISOString() : null, monitoring_period: period, recorder_id: recorderId }); await onSaved() } catch (err) { onError(err) } }} className="rounded-md bg-charcoal-800 px-3 py-1.5 text-xs font-medium text-white">Save</button><button onClick={async () => { if (!window.confirm(`Delete ${recording.filename}?`)) return; try { await deleteRecording(recording.id); await onSaved() } catch (err) { onError(err) } }} className="text-xs text-rose-600">Delete</button></div></div>
}

function AnalysisTab({ projectId, configs, recordings, roleCounts, ready, activeJob, jobs, onConfigCreated, onJob, onError }: { projectId: string; configs: AnalysisConfig[]; recordings: Recording[]; roleCounts: Record<string, number>; ready: boolean; activeJob: AnalysisJob | null; jobs: AnalysisJob[]; onConfigCreated: () => Promise<void>; onJob: (job: AnalysisJob) => void; onError: (err: unknown) => void }) {
  const [configId, setConfigId] = useState(configs[0]?.id || '')
  const [bootstrap, setBootstrap] = useState(500)
  useEffect(() => { if (!configId && configs[0]) setConfigId(configs[0].id) }, [configs, configId])
  const running = activeJob && !TERMINAL_STATES.has(activeJob.state)
  return <div className="space-y-5">
    <section className="card p-5"><div className="flex items-center gap-2"><Settings2 className="h-5 w-5 text-forest-600" /><h2 className="section-title">Analysis configuration</h2></div>{configs.length ? <select value={configId} onChange={(e) => setConfigId(e.target.value)} className="mt-4 w-full rounded-lg border border-charcoal-200 px-3 py-2 text-sm">{configs.map((config) => <option key={config.id} value={config.id}>{config.name} · {config.bootstrap_iterations} bootstrap iterations</option>)}</select> : <div className="mt-4 flex flex-wrap items-end gap-3"><label className="text-xs text-charcoal-500">Bootstrap iterations<input type="number" min={0} max={2000} value={bootstrap} onChange={(e) => setBootstrap(Number(e.target.value))} className="mt-1 block rounded-lg border border-charcoal-200 px-3 py-2 text-sm" /></label><button onClick={async () => { try { await createConfiguration(projectId, { name: 'Prototype default', is_default: true, bootstrap_iterations: bootstrap, temporal_bootstrap_iterations: bootstrap, similarity_scaling_method: 'robust', biological_band_min_hz: 2000, biological_band_max_hz: 8000 }); await onConfigCreated() } catch (err) { onError(err) } }} className="rounded-lg bg-charcoal-800 px-4 py-2 text-sm font-medium text-white">Create configuration</button></div>}<p className="mt-3 text-xs text-charcoal-500">Maximum 2,000 iterations. Direction thresholds and quality limits are configurable prototype defaults, not externally calibrated ecological thresholds.</p></section>
    <section className="card p-5"><h2 className="section-title">Run real backend analysis</h2><p className="mt-2 text-sm text-charcoal-600">Selected inputs: {recordings.length} recordings ({roleCounts.healthy} healthy, {roleCounts.degraded} degraded, {roleCounts.restored} restoration).</p>{!ready && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Add at least 3 healthy-reference, 3 degraded-reference, and 1 restoration recording, then create a configuration.</p>}<div className="mt-4 flex gap-2"><button disabled={!ready || Boolean(running)} onClick={async () => { try { const job = await createAnalysisJob(projectId, configId, recordings.map((r) => r.id)); onJob(job) } catch (err) { onError(err) } }} className="inline-flex items-center gap-2 rounded-lg bg-forest-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"><Play className="h-4 w-4" />Start analysis</button>{running && <button onClick={async () => { try { onJob(await cancelJob(activeJob.id)) } catch (err) { onError(err) } }} className="rounded-lg border border-rose-200 px-4 py-2 text-sm text-rose-700">Cancel</button>}{activeJob?.state === 'failed' && <button onClick={async () => { try { onJob(await retryJob(activeJob.id)) } catch (err) { onError(err) } }} className="rounded-lg border border-charcoal-200 px-4 py-2 text-sm">Retry</button>}</div>{activeJob && <JobProgress job={activeJob} />}</section>
    {jobs.length > 0 && <section className="card p-5"><h2 className="section-title">Job history</h2><div className="mt-3 space-y-2">{jobs.map((job) => <div key={job.id} className="flex justify-between gap-3 border-b border-charcoal-50 py-2 text-xs"><span>{new Date(job.created_at).toLocaleString()}</span><span className="font-medium">{job.state.replace(/_/g, ' ')}</span></div>)}</div></section>}
  </div>
}

function JobProgress({ job }: { job: AnalysisJob }) { return <div className="mt-5"><div className="flex justify-between text-xs text-charcoal-500"><span>{job.current_stage || job.state}</span><span>{job.progress_percent.toFixed(0)}% · {job.processed_recordings}/{job.total_recordings} processed · {job.failed_recordings} failed</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-charcoal-100"><div className="h-full bg-forest-600 transition-all" style={{ width: `${job.progress_percent}%` }} /></div>{job.error_summary && <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{job.error_summary}</p>}</div> }

function ResultsTab({ projectId, recordings, results, summary, job, onChanged, onError }: { projectId: string; recordings: Recording[]; results: RecordingAnalysis[]; summary: ProjectSummary | null; job: AnalysisJob | null; onChanged: () => Promise<void>; onError: (err: unknown) => void }) {
  const recordingMap = useMemo(() => new Map(recordings.map((recording) => [recording.id, recording])), [recordings])
  const temporal = summary?.temporal_result as { sufficient?: boolean; direction?: string; slope_points_per_year?: number; slope_ci_95_per_year?: [number, number] | null; periods?: Array<{ period: string; date: string; recording_count: number; median_score: number }>; message?: string; warnings?: string[] } | undefined
  const download = async (kind: 'json' | 'csv' | 'bundle') => { try { const blob = kind === 'json' ? await exportProjectJson(projectId) : kind === 'csv' ? await exportRecordingsCsv(projectId) : await exportReproducibleBundle(projectId); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `acoustimap-${kind}.${kind === 'bundle' ? 'zip' : kind}`; anchor.click(); URL.revokeObjectURL(url) } catch (err) { onError(err) } }
  if (!summary || !job || !['completed', 'completed_with_warnings'].includes(job.state)) return <div className="card p-10 text-center"><BarChart3 className="mx-auto h-8 w-8 text-charcoal-300" /><h2 className="mt-3 font-display text-xl font-semibold text-charcoal-800">No completed live result</h2><p className="mt-2 text-sm text-charcoal-500">Run the backend analysis to populate this page. No illustrative fallback is shown.</p></div>
  return <div className="space-y-5">
    <section className="grid gap-4 md:grid-cols-3"><ResultMetric label="Acoustic recovery score" value={summary.recovery_score == null ? 'Unavailable' : summary.recovery_score.toFixed(1)} detail="0 = degraded reference; 100 = healthy reference" /><ResultMetric label="Median distance to healthy" value={summary.median_distance_to_healthy == null ? 'Unavailable' : summary.median_distance_to_healthy.toFixed(3)} detail="Scaled feature-space distance; lower is closer" /><ResultMetric label="Bootstrap 95% interval" value={summary.bootstrap_ci_low == null ? 'Unavailable' : `${summary.bootstrap_ci_low.toFixed(1)}–${summary.bootstrap_ci_high?.toFixed(1)}`} detail={`${summary.bootstrap_iterations}/${summary.bootstrap_requested_iterations} successful/requested`} /></section>
    <section className="card p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="section-title">Transparent exports</h2><p className="mt-1 text-xs text-charcoal-500">Exports contain persisted backend results, not browser or mock state.</p></div><div className="flex gap-2">{(['json', 'csv', 'bundle'] as const).map((kind) => <button key={kind} onClick={() => void download(kind)} className="inline-flex items-center gap-1 rounded-lg border border-charcoal-200 px-3 py-2 text-xs font-medium"><Download className="h-3.5 w-3.5" />{kind.toUpperCase()}</button>)}</div></div></section>
    <section className="card p-5"><h2 className="section-title">Temporal momentum</h2><p className="mt-3 text-lg font-semibold text-charcoal-900">{temporal?.sufficient ? temporal.direction : 'Insufficient longitudinal evidence'}</p><p className="mt-1 text-sm text-charcoal-600">{temporal?.sufficient && temporal.slope_points_per_year != null ? `${temporal.slope_points_per_year.toFixed(2)} points/year${temporal.slope_ci_95_per_year ? ` (95% internal bootstrap interval ${temporal.slope_ci_95_per_year[0].toFixed(2)}–${temporal.slope_ci_95_per_year[1].toFixed(2)})` : ''}` : temporal?.message}</p>{temporal?.periods && <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="text-charcoal-400"><th className="py-2">Period</th><th>Date</th><th>Recordings</th><th>Median score</th></tr></thead><tbody>{temporal.periods.map((period) => <tr key={`${period.period}-${period.date}`} className="border-t border-charcoal-50"><td className="py-2">{period.period}</td><td>{new Date(period.date).toLocaleDateString()}</td><td>{period.recording_count}</td><td>{period.median_score.toFixed(1)}</td></tr>)}</tbody></table></div>}</section>
    <section className="space-y-3"><h2 className="section-title">Recording-level results</h2>{results.map((analysis) => { const recording = recordingMap.get(analysis.recording_id); const quality = String(analysis.quality_info.status || 'unknown'); const artifacts = Object.keys(analysis.artifacts); return <article key={analysis.id} className="card p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-medium text-charcoal-900">{recording?.filename || analysis.recording_id}</h3><p className="text-xs text-charcoal-400">{recording?.habitat_category.replace('_', ' ')} · quality: {quality}</p></div>{recording && <audio controls preload="none" src={recordingAudioUrl(recording.id)} className="h-8 max-w-xs" />}</div>{analysis.quality_flags.length > 0 && <div className="mt-3 space-y-1">{analysis.quality_flags.map((flag) => <p key={flag.id} className="text-xs text-amber-800">{flag.flag_code}: {flag.explanation}</p>)}</div>}<div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><MiniMetric label="ACI" value={analysis.ecoacoustic_features.aci} /><MiniMetric label="Biological-Band Spectral Magnitude Ratio (×10)" value={analysis.ecoacoustic_features.biological_band_spectral_magnitude_ratio} /><MiniMetric label="Distance to healthy" value={analysis.comparison.distance_to_healthy} /><MiniMetric label="Recovery score" value={analysis.comparison.recovery_score} /></div><ManualReviewEditor analysis={analysis} onSaved={onChanged} onError={onError} />{artifacts.length > 0 && <div className="mt-4 flex flex-wrap gap-3">{artifacts.map((name) => <figure key={name} className="max-w-sm"><img src={artifactUrl(analysis.id, name)} alt={`${name} for ${recording?.filename || analysis.recording_id}`} className="rounded-lg border border-charcoal-100" /><figcaption className="mt-1 text-[10px] text-charcoal-400">{name}</figcaption></figure>)}</div>}{analysis.errors_warnings.length > 0 && <p className="mt-3 text-xs text-amber-700">{analysis.errors_warnings.join(' · ')}</p>}</article>})}</section>
    <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900"><strong>Interpretation limits:</strong> these results summarize acoustic structure relative to this project’s selected references. They do not identify species, estimate abundance, prove biodiversity recovery, or establish that the intervention caused change.</section>
  </div>
}

function ManualReviewEditor({ analysis, onSaved, onError }: { analysis: RecordingAnalysis; onSaved: () => Promise<void>; onError: (err: unknown) => void }) {
  const existingStatus = String(analysis.quality_info.status || 'review')
  const initialStatus = existingStatus === 'good' || existingStatus === 'excluded' ? existingStatus : 'review'
  const [status, setStatus] = useState<'good' | 'review' | 'excluded'>(initialStatus)
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const latest = analysis.manual_reviews[analysis.manual_reviews.length - 1]
  return <div className="mt-4 rounded-lg border border-charcoal-100 bg-sand-50 p-3"><div className="flex flex-wrap items-end gap-2"><div className="mr-auto"><p className="text-xs font-medium text-charcoal-800">Human quality decision</p><p className="text-[11px] text-charcoal-500">Overrides are saved with an audit trail and apply to this analysis result.</p></div><select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="rounded-md border border-charcoal-200 bg-white px-2 py-1.5 text-xs"><option value="good">Include as good</option><option value="review">Keep for review</option><option value="excluded">Exclude</option></select><input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason" className="min-w-36 rounded-md border border-charcoal-200 bg-white px-2 py-1.5 text-xs" /><input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Reviewer notes" className="min-w-40 flex-1 rounded-md border border-charcoal-200 bg-white px-2 py-1.5 text-xs" /><button disabled={saving} onClick={async () => { setSaving(true); try { await createManualReview(analysis.id, { new_status: status, reason, reviewer_notes: notes }); await onSaved() } catch (err) { onError(err) } finally { setSaving(false) } }} className="rounded-md bg-charcoal-800 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40">{saving ? 'Saving…' : 'Save decision'}</button></div>{latest && <p className="mt-2 text-[11px] text-charcoal-500">Latest review: {latest.new_status}{latest.reason ? ` — ${latest.reason}` : ''} ({new Date(latest.created_at).toLocaleString()})</p>}</div>
}

function ResultMetric({ label, value, detail }: { label: string; value: string; detail: string }) { return <div className="card p-5"><p className="text-xs uppercase tracking-wide text-charcoal-400">{label}</p><p className="mt-2 text-2xl font-semibold text-charcoal-900">{value}</p><p className="mt-2 text-xs text-charcoal-500">{detail}</p></div> }
function MiniMetric({ label, value }: { label: string; value: unknown }) { return <div className="rounded-lg bg-sand-50 p-3"><p className="text-[10px] uppercase text-charcoal-400">{label}</p><p className="mt-1 text-sm font-semibold text-charcoal-800">{typeof value === 'number' ? value.toFixed(3) : 'Unavailable'}</p></div> }
function ChooseProject({ onClick, text = 'Select or create a project before opening the analysis workspace.' }: { onClick: () => void; text?: string }) { return <div className="card p-12 text-center"><FolderOpen className="mx-auto h-10 w-10 text-forest-600" /><h1 className="mt-4 font-display text-2xl font-semibold text-charcoal-900">Choose a project</h1><p className="mt-2 text-sm text-charcoal-500">{text}</p><button onClick={onClick} className="mt-5 rounded-lg bg-forest-700 px-4 py-2 text-sm font-medium text-white">Open Projects</button></div> }
function countRoles(recordings: Recording[]) { return recordings.reduce((counts, recording) => ({ ...counts, [recording.habitat_category]: counts[recording.habitat_category] + 1 }), { healthy: 0, degraded: 0, restored: 0 } as Record<'healthy' | 'degraded' | 'restored', number>) }
function messageFrom(err: unknown): string { if (err instanceof ApiError) return typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail); return err instanceof Error ? err.message : 'Unexpected error' }
