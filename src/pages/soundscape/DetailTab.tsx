import { useState, useRef, useEffect } from 'react'
import { ArrowLeft, Download, CircleAlert as AlertCircle, FileAudio } from 'lucide-react'
import { useSoundscape } from '../../soundscape/SoundscapeContext'
import type { Recording, QualityStatus, ExclusionReason, SegmentSelection } from '../../soundscape/types'
import { QUALITY_LABELS, EXCLUSION_LABELS, HABITAT_LABELS } from '../../soundscape/types'
import { HabitatBadge, QualityBadge, MetricSourceBadge } from '../../components/SoundscapeBadges'
import AudioPlayer from '../../components/AudioPlayer'
import Waveform from '../../components/Waveform'
import Spectrogram from '../../components/Spectrogram'
import { downloadRecordingMetadata } from '../../soundscape/exportUtils'

export default function DetailTab() {
  const { state, setSelectedRecording, updateMetadata, updateQuality, setTab } = useSoundscape()
  const recording = state.recordings.find((r) => r.id === state.selectedRecordingId)

  if (!recording) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-charcoal-400">No recording selected.</p>
        <button
          onClick={() => setTab('library')}
          className="mt-3 rounded-lg bg-forest-700 px-3 py-1.5 text-sm font-medium text-sand-50 hover:bg-forest-800 transition-colors"
        >
          Go to Recording Library
        </button>
      </div>
    )
  }

  return (
    <RecordingDetail
      recording={recording}
      onBack={() => { setSelectedRecording(null); setTab('library') }}
      onUpdateMetadata={updateMetadata}
      onUpdateQuality={updateQuality}
    />
  )
}

function RecordingDetail({
  recording,
  onBack,
  onUpdateMetadata,
  onUpdateQuality,
}: {
  recording: Recording
  onBack: () => void
  onUpdateMetadata: (id: string, updates: Partial<Recording['metadata']>) => void
  onUpdateQuality: (id: string, updates: Partial<Recording['quality']>) => void
}) {
  const [segment, setSegment] = useState<SegmentSelection | null>(null)
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    if (!recording.file || !recording.objectUrl) return
    let cancelled = false
    const ctx = new AudioContext()
    recording.file.arrayBuffer().then((arr) => {
      if (cancelled) return
      ctx.decodeAudioData(arr).then((buf) => {
        if (!cancelled) setBuffer(buf)
      }).catch(() => {})
    })
    return () => { cancelled = true; ctx.close() }
  }, [recording.file, recording.objectUrl])

  const duration = recording.browserFeatures?.duration ?? 0

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-medium text-charcoal-600 hover:text-charcoal-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Library
        </button>
        <button
          onClick={() => downloadRecordingMetadata(recording)}
          className="flex items-center gap-1.5 rounded-lg border border-charcoal-200 px-3 py-1.5 text-sm font-medium text-charcoal-600 hover:bg-sand-50 transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          Download metadata JSON
        </button>
      </div>

      <div className="flex items-center gap-3">
        <FileAudio className="h-5 w-5 text-charcoal-400" />
        <h2 className="font-display text-xl font-semibold text-charcoal-900">{recording.metadata.name}</h2>
        <HabitatBadge category={recording.metadata.habitatCategory} />
        <QualityBadge status={recording.quality.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-charcoal-800 mb-3">Audio Player</h3>
            <AudioPlayer
              src={recording.objectUrl ?? undefined}
              onTimeUpdate={setCurrentTime}
              audioRef={audioRef}
              disabled={!recording.hasAudio}
              disabledNote={recording.audioAssetNote ?? undefined}
              segment={segment}
              loopSegment={false}
            />
          </div>

          {recording.hasAudio && recording.waveformPeaks && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-charcoal-800 mb-3">Waveform</h3>
              <Waveform
                peaks={recording.waveformPeaks}
                duration={duration}
                audioElement={audioRef.current}
                onSegmentChange={setSegment}
                segment={segment}
                height={80}
              />
            </div>
          )}

          {recording.hasAudio && buffer && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-charcoal-800 mb-3">Spectrogram</h3>
              <Spectrogram
                audioBuffer={buffer}
                duration={duration}
                segment={segment}
                currentTime={currentTime}
                height={160}
              />
            </div>
          )}

          {!recording.hasAudio && (
            <div className="card p-4">
              <div className="flex items-center justify-center gap-2 py-8 text-center rounded-lg bg-sand-50 border border-dashed border-charcoal-200">
                <p className="text-sm text-charcoal-400">No audio loaded for this recording</p>
              </div>
              {recording.audioAssetNote && (
                <p className="mt-2 text-center text-xs text-charcoal-400">{recording.audioAssetNote}</p>
              )}
            </div>
          )}

          {segment && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-charcoal-800 mb-2">Segment-level browser calculations</h3>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs text-charcoal-600">
                  {segment.startTime.toFixed(2)}s – {segment.endTime.toFixed(2)}s ({(segment.endTime - segment.startTime).toFixed(2)}s)
                </span>
                <button
                  onClick={() => setSegment(null)}
                  className="text-xs text-charcoal-500 hover:text-charcoal-700"
                >
                  Reset selection
                </button>
              </div>
              <p className="text-xs text-charcoal-500">
                Segment-level features are calculated from the selected portion of the audio. These are technical quality indicators, not biodiversity metrics.
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-charcoal-800 mb-3">Metadata</h3>
            <MetadataEditor recording={recording} onUpdate={onUpdateMetadata} />
          </div>

          <div className="card p-4">
            <h3 className="text-sm font-semibold text-charcoal-800 mb-3">Quality Assessment</h3>
            <QualityPanel recording={recording} onUpdate={onUpdateQuality} />
          </div>

          {recording.browserFeatures && (
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-charcoal-800">Browser-calculated technical features</h3>
                <MetricSourceBadge source="browser" />
              </div>
              <FeatureTable features={recording.browserFeatures} />
            </div>
          )}

          {recording.importedFeatures && (
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-charcoal-800">Imported scientific metrics</h3>
                <MetricSourceBadge source="python" />
              </div>
              <ImportedMetricsTable recording={recording} />
            </div>
          )}

          {!recording.importedFeatures && (
            <div className="card p-4">
              <div className="flex items-center gap-2 text-sm text-charcoal-500">
                <AlertCircle className="h-4 w-4" />
                Analysis not available — import Python pipeline results.
              </div>
            </div>
          )}

          {recording.metadata.notes && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-charcoal-800 mb-2">Notes</h3>
              <p className="text-xs text-charcoal-600">{recording.metadata.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MetadataEditor({
  recording,
  onUpdate,
}: {
  recording: Recording
  onUpdate: (id: string, updates: Partial<Recording['metadata']>) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-2">
      <div>
        <label className="text-[10px] font-medium uppercase text-charcoal-400">Recording name</label>
        <input
          type="text"
          value={recording.metadata.name}
          onChange={(e) => onUpdate(recording.id, { name: e.target.value })}
          className="w-full rounded-md border border-charcoal-200 bg-white px-2.5 py-1.5 text-xs"
        />
      </div>
      <div>
        <label className="text-[10px] font-medium uppercase text-charcoal-400">Habitat category</label>
        <select
          value={recording.metadata.habitatCategory}
          onChange={(e) => onUpdate(recording.id, { habitatCategory: e.target.value as Recording['metadata']['habitatCategory'] })}
          className="w-full rounded-md border border-charcoal-200 bg-white px-2.5 py-1.5 text-xs"
        >
          {(Object.keys(HABITAT_LABELS) as Recording['metadata']['habitatCategory'][]).map((h) => (
            <option key={h} value={h}>{HABITAT_LABELS[h]}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-[10px] font-medium uppercase text-charcoal-400">Monitoring site</label>
        <input
          type="text"
          value={recording.metadata.site}
          onChange={(e) => onUpdate(recording.id, { site: e.target.value })}
          className="w-full rounded-md border border-charcoal-200 bg-white px-2.5 py-1.5 text-xs"
        />
      </div>
      <div>
        <label className="text-[10px] font-medium uppercase text-charcoal-400">Recording date and time</label>
        <input
          type="datetime-local"
          value={recording.metadata.timestamp.slice(0, 16)}
          onChange={(e) => onUpdate(recording.id, { timestamp: e.target.value })}
          className="w-full rounded-md border border-charcoal-200 bg-white px-2.5 py-1.5 text-xs"
        />
      </div>
      <div>
        <label className="text-[10px] font-medium uppercase text-charcoal-400">Monitoring period</label>
        <input
          type="text"
          value={recording.metadata.monitoringPeriod}
          onChange={(e) => onUpdate(recording.id, { monitoringPeriod: e.target.value })}
          className="w-full rounded-md border border-charcoal-200 bg-white px-2.5 py-1.5 text-xs"
        />
      </div>
      <div>
        <label className="text-[10px] font-medium uppercase text-charcoal-400">Recorder ID</label>
        <input
          type="text"
          value={recording.metadata.recorderId}
          onChange={(e) => onUpdate(recording.id, { recorderId: e.target.value })}
          className="w-full rounded-md border border-charcoal-200 bg-white px-2.5 py-1.5 text-xs"
        />
      </div>
      <div>
        <label className="text-[10px] font-medium uppercase text-charcoal-400">Notes</label>
        <textarea
          value={recording.metadata.notes}
          onChange={(e) => onUpdate(recording.id, { notes: e.target.value })}
          className="w-full rounded-md border border-charcoal-200 bg-white px-2.5 py-1.5 text-xs"
          rows={2}
        />
      </div>
    </div>
  )
}

function QualityPanel({
  recording,
  onUpdate,
}: {
  recording: Recording
  onUpdate: (id: string, updates: Partial<Recording['quality']>) => void
}) {
  const statuses: QualityStatus[] = ['good', 'review', 'excluded']
  const exclusionReasons: NonNullable<ExclusionReason>[] = [
    'excessive_clipping',
    'near_silence',
    'short_duration',
    'inconsistent_sample_rate',
    'low_frequency_noise',
    'missing_metadata',
    'pipeline_contaminated',
    'manual_exclusion',
  ]

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="text-[10px] font-medium uppercase text-charcoal-400">Quality status</label>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => onUpdate(recording.id, { status: s })}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                recording.quality.status === s
                  ? s === 'good'
                    ? 'bg-forest-100 text-forest-800 ring-1 ring-forest-300'
                    : s === 'review'
                    ? 'bg-amber-100 text-amber-800 ring-1 ring-amber-300'
                    : 'bg-rose-100 text-rose-800 ring-1 ring-rose-300'
                  : 'bg-sand-50 text-charcoal-500 hover:bg-sand-100'
              }`}
            >
              {QUALITY_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[10px] font-medium uppercase text-charcoal-400">Auto recommendation</label>
        <p className="text-xs text-charcoal-600 mt-0.5">
          {recording.quality.autoRecommendation === 'keep' && 'Keep — no quality issues detected.'}
          {recording.quality.autoRecommendation === 'review' && 'Review recommended — some quality concerns detected.'}
          {recording.quality.autoRecommendation === 'exclude' && 'Exclude recommended — multiple quality issues detected.'}
        </p>
      </div>

      {recording.quality.warnings.length > 0 && (
        <div>
          <label className="text-[10px] font-medium uppercase text-charcoal-400">Warnings</label>
          <div className="mt-1 flex flex-col gap-1">
            {recording.quality.warnings.map((w, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-amber-700">
                <AlertCircle className="h-3 w-3" />
                {w}
              </div>
            ))}
          </div>
        </div>
      )}

      {recording.quality.status === 'excluded' && (
        <div>
          <label className="text-[10px] font-medium uppercase text-charcoal-400">Exclusion reason</label>
          <select
            value={recording.quality.exclusionReason ?? ''}
            onChange={(e) => onUpdate(recording.id, { exclusionReason: e.target.value as ExclusionReason || null })}
            className="w-full rounded-md border border-charcoal-200 bg-white px-2.5 py-1.5 text-xs"
          >
            <option value="">Select reason...</option>
            {exclusionReasons.map((r) => (
              <option key={r} value={r}>{EXCLUSION_LABELS[r]}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="text-[10px] font-medium uppercase text-charcoal-400">Reviewer notes</label>
        <textarea
          value={recording.quality.reviewerNotes}
          onChange={(e) => onUpdate(recording.id, { reviewerNotes: e.target.value })}
          className="w-full rounded-md border border-charcoal-200 bg-white px-2.5 py-1.5 text-xs"
          rows={2}
        />
      </div>

      {recording.quality.status === 'excluded' && (
        <button
          onClick={() => onUpdate(recording.id, { status: 'review', exclusionReason: null })}
          className="rounded-md bg-forest-50 px-3 py-1.5 text-xs font-medium text-forest-700 hover:bg-forest-100 transition-colors"
        >
          Restore recording
        </button>
      )}
    </div>
  )
}

function FeatureTable({ features }: { features: NonNullable<Recording['browserFeatures']> }) {
  const rows: { label: string; value: string; hint: string }[] = [
    { label: 'Duration', value: `${features.duration.toFixed(2)} s`, hint: 'Recording property' },
    { label: 'Peak amplitude', value: features.peakAmplitude.toFixed(6), hint: 'Recording property' },
    { label: 'RMS amplitude', value: features.rmsAmplitude.toFixed(6), hint: 'Recording property' },
    { label: 'Dynamic range', value: `${features.dynamicRange.toFixed(2)} dB`, hint: 'Recording property' },
    { label: 'Zero-crossing rate', value: features.zeroCrossingRate.toFixed(6), hint: 'Recording property' },
    { label: 'Clipping %', value: `${features.clippingPercent.toFixed(2)}%`, hint: 'Quality-control indicator' },
    { label: 'Silence proportion', value: `${(features.silenceProportion * 100).toFixed(1)}%`, hint: 'Quality-control indicator' },
    { label: 'Low-freq energy', value: `${(features.lowFreqEnergy * 100).toFixed(1)}%`, hint: 'Frequency distribution' },
    { label: 'Mid-freq energy', value: `${(features.midFreqEnergy * 100).toFixed(1)}%`, hint: 'Frequency distribution' },
    { label: 'High-freq energy', value: `${(features.highFreqEnergy * 100).toFixed(1)}%`, hint: 'Frequency distribution' },
    { label: 'Sample rate', value: `${features.sampleRate} Hz`, hint: 'Recording property' },
    { label: 'Channels', value: String(features.channels), hint: 'Recording property' },
  ]

  return (
    <div className="flex flex-col gap-1">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between py-1 border-b border-charcoal-50 last:border-0">
          <div>
            <span className="text-xs text-charcoal-600">{r.label}</span>
            <span className="text-[10px] text-charcoal-400 ml-1.5">{r.hint}</span>
          </div>
          <span className="text-xs font-medium text-charcoal-700 tabular-nums">{r.value}</span>
        </div>
      ))}
    </div>
  )
}

function ImportedMetricsTable({ recording }: { recording: Recording }) {
  const features = recording.importedFeatures!
  const comparison = recording.comparison
  const rows: { label: string; value: string | null }[] = [
    { label: 'ACI', value: features.aci != null ? features.aci.toFixed(3) : null },
    { label: 'BI', value: features.bi != null ? features.bi.toFixed(2) : null },
    { label: 'Biological freq. occupancy', value: features.biologicalFrequencyOccupancy != null ? features.biologicalFrequencyOccupancy.toFixed(3) : null },
    { label: 'Anthropogenic noise pressure', value: features.anthropogenicNoisePressure != null ? features.anthropogenicNoisePressure.toFixed(3) : null },
    { label: 'Spectral entropy', value: features.spectralEntropy != null ? features.spectralEntropy.toFixed(3) : null },
    { label: 'Healthy-ref similarity', value: comparison?.healthyReferenceSimilarity != null ? `${(comparison.healthyReferenceSimilarity * 100).toFixed(0)}%` : null },
    { label: 'Degraded-ref similarity', value: comparison?.degradedReferenceSimilarity != null ? `${(comparison.degradedReferenceSimilarity * 100).toFixed(0)}%` : null },
  ]

  return (
    <div className="flex flex-col gap-1">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between py-1 border-b border-charcoal-50 last:border-0">
          <span className="text-xs text-charcoal-600">{r.label}</span>
          <span className="text-xs font-medium text-charcoal-700 tabular-nums">{r.value ?? '—'}</span>
        </div>
      ))}
    </div>
  )
}
