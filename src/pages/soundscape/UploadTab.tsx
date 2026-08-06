import { useState, useRef, useCallback } from 'react'
import { Upload, X, FileAudio, CircleAlert as AlertCircle, Loader as Loader2, Info, Trash2, Pencil } from 'lucide-react'
import { useSoundscape } from '../../soundscape/SoundscapeContext'
import { decodeAudioFile, validateFile } from '../../soundscape/audioUtils'
import type { Recording, HabitatCategory } from '../../soundscape/types'
import { HABITAT_LABELS } from '../../soundscape/types'
import { HabitatBadge } from '../../components/SoundscapeBadges'

interface PendingFile {
  file: File
  id: string
  error: string | null
  status: 'pending' | 'decoding' | 'ready' | 'error'
  metadata: {
    name: string
    habitatCategory: HabitatCategory
    site: string
    timestamp: string
    monitoringPeriod: string
    recorderId: string
    notes: string
  }
  recordingId?: string
  validationWarnings: string[]
}

export default function UploadTab() {
  const { state, addRecording, setBrowserFeatures, setLoadStatus, removeRecording, updateMetadata } = useSoundscape()
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null)
  const [cancelRef, setCancelRef] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    const newPending: PendingFile[] = fileArray.map((file) => ({
      file,
      id: 'pending_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      error: validateFile(file),
      status: 'pending' as const,
      metadata: {
        name: file.name.replace(/\.[^/.]+$/, ''),
        habitatCategory: 'restored' as HabitatCategory,
        site: '',
        timestamp: new Date().toISOString().slice(0, 16),
        monitoringPeriod: 'January–June 2026',
        recorderId: '',
        notes: '',
      },
      validationWarnings: [],
    }))
    setPendingFiles((prev) => [...prev, ...newPending])
  }, [])

  const processFile = useCallback(
    async (pf: PendingFile) => {
      if (pf.error) return
      setPendingFiles((prev) =>
        prev.map((p) => (p.id === pf.id ? { ...p, status: 'decoding' } : p)),
      )
      const recordingId = addRecording(pf.file, pf.metadata)
      setPendingFiles((prev) =>
        prev.map((p) => (p.id === pf.id ? { ...p, recordingId } : p)),
      )

      try {
        const { features, waveformPeaks } = await decodeAudioFile(pf.file)
        setBrowserFeatures(recordingId, features, waveformPeaks)

        const warnings: string[] = []
        if (features.duration < 5) warnings.push('Recording shorter than 5 seconds')
        if (features.duration > 600) warnings.push('Recording longer than 10 minutes')
        if (features.rmsAmplitude < 0.005) warnings.push('Extremely low signal level')
        if (features.clippingPercent > 0.5) warnings.push('Possible clipping detected')
        if (features.silenceProportion > 0.6) warnings.push('Silent or nearly silent recording')
        setPendingFiles((prev) =>
          prev.map((p) => (p.id === pf.id ? { ...p, status: 'ready', validationWarnings: warnings } : p)),
        )
      } catch (err) {
        console.error('Audio decode error:', err)
        setLoadStatus(recordingId, 'error', 'File failed to decode. The format may be corrupted or unsupported by this browser.')
        setPendingFiles((prev) =>
          prev.map((p) =>
            p.id === pf.id
              ? { ...p, status: 'error', error: 'File failed to decode. The format may be corrupted or unsupported by this browser.' }
              : p,
          ),
        )
      }
    },
    [addRecording, setBrowserFeatures, setLoadStatus],
  )

  const processAll = useCallback(async () => {
    const toProcess = pendingFiles.filter((p) => p.status === 'pending' && !p.error)
    if (toProcess.length === 0) return
    setCancelRef(false)
    setBatchProgress({ current: 0, total: toProcess.length })
    for (let i = 0; i < toProcess.length; i++) {
      if (cancelRef) break
      setBatchProgress({ current: i + 1, total: toProcess.length })
      await processFile(toProcess[i])
    }
    setBatchProgress(null)
  }, [pendingFiles, processFile, cancelRef])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const removePendingFile = (id: string) => {
    setPendingFiles((prev) => prev.filter((p) => p.id !== id))
  }

  const updatePendingMetadata = (id: string, updates: Partial<PendingFile['metadata']>) => {
    setPendingFiles((prev) =>
      prev.map((p) => (p.id === id ? { ...p, metadata: { ...p.metadata, ...updates } } : p)),
    )
  }

  const uploadedRecordings = state.recordings.filter((r) => r.hasAudio)

  return (
    <div className="flex flex-col gap-6">
      <div className="card p-5">
        <h3 className="section-title mb-2">Upload Recordings</h3>
        <p className="text-sm text-charcoal-600 mb-4">
          Upload ecosystem audio recordings (WAV, MP3, M4A, OGG). Files are processed in your browser and are not uploaded to any server.
        </p>

        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
            isDragging ? 'border-forest-400 bg-forest-50/50' : 'border-charcoal-200 bg-sand-50'
          }`}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-forest-50 text-forest-600">
            <Upload className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium text-charcoal-700">Drag and drop audio files here</p>
          <p className="text-xs text-charcoal-400">or</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg bg-forest-700 px-4 py-2 text-sm font-medium text-sand-50 hover:bg-forest-800 transition-colors focus-visible:ring-2 focus-visible:ring-forest-500 focus-visible:ring-offset-2"
          >
            Select files
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".wav,.mp3,.m4a,.ogg,audio/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files)
              e.target.value = ''
            }}
          />
          <p className="text-[11px] text-charcoal-400">Supported: WAV, MP3, M4A, OGG · Multiple files allowed</p>
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-lg bg-ocean-50 px-3 py-2.5">
          <Info className="h-4 w-4 shrink-0 text-ocean-600 mt-0.5" />
          <p className="text-xs text-ocean-800">
            Audio files remain in this browser session unless exported or connected to a backend. Metadata is saved to localStorage and will persist across reloads, but the audio files themselves will need to be re-uploaded.
          </p>
        </div>
      </div>

      {batchProgress && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-charcoal-700">
              Processing recording {batchProgress.current} of {batchProgress.total}
            </span>
            <button
              onClick={() => setCancelRef(true)}
              className="text-xs text-rose-600 hover:text-rose-700 font-medium"
            >
              Cancel batch
            </button>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-sand-100">
            <div
              className="h-full rounded-full bg-forest-500 transition-all"
              style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {pendingFiles.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title">Pending Files ({pendingFiles.length})</h3>
            <button
              onClick={processAll}
              disabled={batchProgress !== null || pendingFiles.every((p) => p.status !== 'pending' || !!p.error)}
              className="rounded-lg bg-forest-700 px-3 py-1.5 text-sm font-medium text-sand-50 hover:bg-forest-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Process all
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {pendingFiles.map((pf) => (
              <div key={pf.id} className="rounded-lg border border-charcoal-100 bg-sand-50/50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <FileAudio className="h-5 w-5 shrink-0 text-charcoal-400 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-charcoal-800 truncate">{pf.file.name}</p>
                      <p className="text-xs text-charcoal-400">
                        {(pf.file.size / 1024 / 1024).toFixed(2)} MB · {pf.file.type || 'unknown type'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {pf.status === 'decoding' && <Loader2 className="h-4 w-4 animate-spin text-forest-600" />}
                    {pf.status === 'ready' && <span className="text-xs font-medium text-forest-600">Ready</span>}
                    {pf.error && <span className="flex items-center gap-1 text-xs text-rose-600"><AlertCircle className="h-3.5 w-3.5" />Error</span>}
                    <button
                      onClick={() => removePendingFile(pf.id)}
                      className="text-charcoal-400 hover:text-rose-600 transition-colors"
                      aria-label="Remove file"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {pf.error && (
                  <div className="mt-2 flex items-start gap-2 rounded-md bg-rose-50 px-3 py-2">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-600 mt-0.5" />
                    <p className="text-xs text-rose-700">{pf.error}</p>
                  </div>
                )}

                {pf.validationWarnings.length > 0 && (
                  <div className="mt-2 flex flex-col gap-1">
                    {pf.validationWarnings.map((w, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs text-amber-700">
                        <AlertCircle className="h-3 w-3" />
                        {w}
                      </div>
                    ))}
                  </div>
                )}

                {pf.status === 'pending' && !pf.error && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Recording name"
                      value={pf.metadata.name}
                      onChange={(e) => updatePendingMetadata(pf.id, { name: e.target.value })}
                      className="rounded-md border border-charcoal-200 bg-white px-2.5 py-1.5 text-xs"
                    />
                    <select
                      value={pf.metadata.habitatCategory}
                      onChange={(e) => updatePendingMetadata(pf.id, { habitatCategory: e.target.value as HabitatCategory })}
                      className="rounded-md border border-charcoal-200 bg-white px-2.5 py-1.5 text-xs"
                    >
                      {(Object.keys(HABITAT_LABELS) as HabitatCategory[]).map((h) => (
                        <option key={h} value={h}>{HABITAT_LABELS[h]}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Monitoring site"
                      value={pf.metadata.site}
                      onChange={(e) => updatePendingMetadata(pf.id, { site: e.target.value })}
                      className="rounded-md border border-charcoal-200 bg-white px-2.5 py-1.5 text-xs"
                    />
                    <input
                      type="datetime-local"
                      value={pf.metadata.timestamp}
                      onChange={(e) => updatePendingMetadata(pf.id, { timestamp: e.target.value })}
                      className="rounded-md border border-charcoal-200 bg-white px-2.5 py-1.5 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Recorder ID"
                      value={pf.metadata.recorderId}
                      onChange={(e) => updatePendingMetadata(pf.id, { recorderId: e.target.value })}
                      className="rounded-md border border-charcoal-200 bg-white px-2.5 py-1.5 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Monitoring period"
                      value={pf.metadata.monitoringPeriod}
                      onChange={(e) => updatePendingMetadata(pf.id, { monitoringPeriod: e.target.value })}
                      className="rounded-md border border-charcoal-200 bg-white px-2.5 py-1.5 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Optional notes"
                      value={pf.metadata.notes}
                      onChange={(e) => updatePendingMetadata(pf.id, { notes: e.target.value })}
                      className="sm:col-span-2 rounded-md border border-charcoal-200 bg-white px-2.5 py-1.5 text-xs"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {uploadedRecordings.length > 0 && (
        <div className="card p-5">
          <h3 className="section-title mb-4">Uploaded Recordings ({uploadedRecordings.length})</h3>
          <div className="flex flex-col gap-2">
            {uploadedRecordings.map((rec) => (
              <div key={rec.id} className="flex items-center justify-between gap-3 rounded-lg border border-charcoal-100 bg-white px-3 py-2.5">
                <div className="flex items-center gap-3 min-w-0">
                  <FileAudio className="h-4 w-4 shrink-0 text-charcoal-400" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-charcoal-800 truncate">{rec.metadata.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <HabitatBadge category={rec.metadata.habitatCategory} size="xs" />
                      <span className="text-[10px] text-charcoal-400">
                        {rec.loadStatus === 'ready' ? `${rec.browserFeatures?.duration.toFixed(1)}s` : rec.loadStatus}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {rec.loadStatus === 'decoding' && <Loader2 className="h-4 w-4 animate-spin text-forest-600" />}
                  {rec.loadStatus === 'error' && <AlertCircle className="h-4 w-4 text-rose-500" />}
                  <button
                    onClick={() => setEditingId(editingId === rec.id ? null : rec.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-charcoal-400 hover:bg-sand-100 transition-colors"
                    aria-label="Edit metadata"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => removeRecording(rec.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-charcoal-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                    aria-label="Remove recording"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {editingId && <EditMetadataPanel id={editingId} recording={uploadedRecordings.find((r) => r.id === editingId)!} onUpdate={updateMetadata} />}
        </div>
      )}
    </div>
  )
}

function EditMetadataPanel({
  recording,
  onUpdate,
}: {
  id: string
  recording: Recording
  onUpdate: (id: string, updates: Partial<Recording['metadata']>) => void
}) {
  return (
    <div className="mt-3 rounded-lg border border-charcoal-100 bg-sand-50/50 p-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input
          type="text"
          placeholder="Recording name"
          value={recording.metadata.name}
          onChange={(e) => onUpdate(recording.id, { name: e.target.value })}
          className="rounded-md border border-charcoal-200 bg-white px-2.5 py-1.5 text-xs"
        />
        <select
          value={recording.metadata.habitatCategory}
          onChange={(e) => onUpdate(recording.id, { habitatCategory: e.target.value as HabitatCategory })}
          className="rounded-md border border-charcoal-200 bg-white px-2.5 py-1.5 text-xs"
        >
          {(Object.keys(HABITAT_LABELS) as HabitatCategory[]).map((h) => (
            <option key={h} value={h}>{HABITAT_LABELS[h]}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Monitoring site"
          value={recording.metadata.site}
          onChange={(e) => onUpdate(recording.id, { site: e.target.value })}
          className="rounded-md border border-charcoal-200 bg-white px-2.5 py-1.5 text-xs"
        />
        <input
          type="datetime-local"
          value={recording.metadata.timestamp.slice(0, 16)}
          onChange={(e) => onUpdate(recording.id, { timestamp: e.target.value })}
          className="rounded-md border border-charcoal-200 bg-white px-2.5 py-1.5 text-xs"
        />
        <input
          type="text"
          placeholder="Recorder ID"
          value={recording.metadata.recorderId}
          onChange={(e) => onUpdate(recording.id, { recorderId: e.target.value })}
          className="rounded-md border border-charcoal-200 bg-white px-2.5 py-1.5 text-xs"
        />
        <input
          type="text"
          placeholder="Monitoring period"
          value={recording.metadata.monitoringPeriod}
          onChange={(e) => onUpdate(recording.id, { monitoringPeriod: e.target.value })}
          className="rounded-md border border-charcoal-200 bg-white px-2.5 py-1.5 text-xs"
        />
        <input
          type="text"
          placeholder="Notes"
          value={recording.metadata.notes}
          onChange={(e) => onUpdate(recording.id, { notes: e.target.value })}
          className="sm:col-span-2 rounded-md border border-charcoal-200 bg-white px-2.5 py-1.5 text-xs"
        />
      </div>
    </div>
  )
}
