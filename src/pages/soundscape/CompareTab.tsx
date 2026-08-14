import { useState, useRef, useEffect, useCallback } from 'react'
import { Play, Pause, CircleAlert as AlertCircle, Info, Lock, Clock as Unlock } from 'lucide-react'
import { useSoundscape } from '../../soundscape/SoundscapeContext'
import type { Recording, HabitatCategory, SegmentSelection } from '../../soundscape/types'
import { HABITAT_LABELS } from '../../soundscape/types'
import { QualityBadge } from '../../components/SoundscapeBadges'
import AudioPlayer from '../../components/AudioPlayer'
import Waveform from '../../components/Waveform'
import Spectrogram from '../../components/Spectrogram'

const HABITAT_COLS: { key: HabitatCategory; label: string; color: string }[] = [
  { key: 'healthy', label: 'Healthy Reference', color: '#3c7349' },
  { key: 'restored', label: 'Restored Site', color: '#32729f' },
  { key: 'degraded', label: 'Degraded Comparison', color: '#b91c1c' },
]

export default function CompareTab() {
  const { state, setSelections, setSettings } = useSoundscape()
  const { recordings, selections, settings } = state

  const healthyRec = recordings.find((r) => r.id === selections.healthy)
  const restoredRec = recordings.find((r) => r.id === selections.restored)
  const degradedRec = recordings.find((r) => r.id === selections.degraded)

  const [segments, setSegments] = useState<Record<string, SegmentSelection | null>>({})
  const [, setAudioBuffers] = useState<Record<string, AudioBuffer>>({})
  const [currentTime, setCurrentTime] = useState<Record<string, number>>({})
  const [syncPlaying, setSyncPlaying] = useState(false)

  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({})

  const recordingsByHabitat = (habitat: HabitatCategory) =>
    recordings.filter((r) => r.metadata.habitatCategory === habitat && r.quality.status !== 'excluded')

  const handleSelection = (habitat: HabitatCategory, id: string) => {
    setSelections({ [habitat]: id })
  }

  const toggleSyncPlayback = () => {
    const newSync = !settings.syncPlayback
    setSettings({ syncPlayback: newSync })
    if (newSync) {
      const allPlaying = [healthyRec, restoredRec, degradedRec].some((r) => r && audioRefs.current[r.id] && !audioRefs.current[r.id]?.paused)
      setSyncPlaying(allPlaying)
    } else {
      setSyncPlaying(false)
    }
  }

  const handleSyncPlay = useCallback(() => {
    if (settings.syncPlayback) setSyncPlaying(true)
  }, [settings.syncPlayback])

  const handleSyncPause = useCallback(() => {
    if (settings.syncPlayback) setSyncPlaying(false)
  }, [settings.syncPlayback])

  const handleSyncSeek = useCallback((sourceId: string) => {
    if (!settings.syncPlayback) return
    const source = audioRefs.current[sourceId]
    if (!source || !source.duration) return
    const progress = source.currentTime / source.duration
    for (const [id, audio] of Object.entries(audioRefs.current)) {
      if (id !== sourceId && audio && audio.duration) {
        audio.currentTime = progress * audio.duration
      }
    }
  }, [settings.syncPlayback])

  useEffect(() => {
    if (!settings.syncPlayback) return
    if (syncPlaying) {
      for (const audio of Object.values(audioRefs.current)) {
        if (audio && audio.paused) audio.play().catch(() => {})
      }
    } else {
      for (const audio of Object.values(audioRefs.current)) {
        if (audio && !audio.paused) audio.pause()
      }
    }
  }, [syncPlaying, settings.syncPlayback])

  const togglePlayAll = () => {
    setSyncPlaying((p) => !p)
  }

  const hasAnyAudio = [healthyRec, restoredRec, degradedRec].some((r) => r?.hasAudio && r?.objectUrl)

  const durations = [healthyRec, restoredRec, degradedRec].map((r) => r?.browserFeatures?.duration ?? 0)
  const durationMismatch = durations.some((d) => d > 0) && Math.max(...durations) - Math.min(...durations.filter((d) => d > 0)) > 5

  return (
    <div className="flex flex-col gap-6">
      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="section-title">Three-Way Comparison</h3>
          <div className="flex items-center gap-3">
            {hasAnyAudio && (
              <button
                onClick={togglePlayAll}
                disabled={!settings.syncPlayback}
                className="flex items-center gap-1.5 rounded-lg bg-forest-700 px-3 py-1.5 text-sm font-medium text-sand-50 hover:bg-forest-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {syncPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {syncPlaying ? 'Pause all' : 'Play all'}
              </button>
            )}
            <button
              onClick={toggleSyncPlayback}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                settings.syncPlayback
                  ? 'border-forest-300 bg-forest-50 text-forest-700'
                  : 'border-charcoal-200 bg-white text-charcoal-600 hover:bg-sand-50'
              }`}
            >
              {settings.syncPlayback ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
              Synchronised playback
            </button>
          </div>
        </div>
        {settings.syncPlayback && durationMismatch && (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <p className="text-xs text-amber-800">
              Recordings have different durations. Synchronised playback uses relative progress, so they will reach the end at different times.
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {HABITAT_COLS.map((col) => {
          const rec = col.key === 'healthy' ? healthyRec : col.key === 'restored' ? restoredRec : degradedRec
          const habitatRecordings = recordingsByHabitat(col.key)
          return (
            <div key={col.key} className="card p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-charcoal-800">{col.label}</h4>
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: col.color }} aria-hidden="true" />
              </div>

              <select
                value={selections[col.key] ?? ''}
                onChange={(e) => handleSelection(col.key, e.target.value)}
                className="rounded-lg border border-charcoal-200 bg-white px-2.5 py-1.5 text-sm"
              >
                <option value="">Select a recording...</option>
                {habitatRecordings.map((r) => (
                  <option key={r.id} value={r.id}>{r.metadata.name}</option>
                ))}
              </select>

              {rec ? (
                <RecordingComparisonCard
                  recording={rec}
                  accentColor={col.color}
                  audioRef={(el) => { audioRefs.current[rec.id] = el }}
                  onTimeUpdate={(t) => setCurrentTime((prev) => ({ ...prev, [rec.id]: t }))}
                  onBufferDecoded={(buf) => setAudioBuffers((prev) => ({ ...prev, [rec.id]: buf }))}
                  segment={segments[rec.id] ?? null}
                  onSegmentChange={(seg) => setSegments((prev) => ({ ...prev, [rec.id]: seg }))}
                  onSyncPlay={handleSyncPlay}
                  onSyncPause={handleSyncPause}
                  onSyncSeek={() => handleSyncSeek(rec.id)}
                  currentTime={currentTime[rec.id] ?? 0}
                />
              ) : (
                <div className="flex items-center justify-center py-8 text-center rounded-lg bg-sand-50 border border-dashed border-charcoal-200">
                  <p className="text-xs text-charcoal-400">No recording selected</p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {restoredRec?.comparison?.healthyReferenceSimilarity != null && restoredRec?.comparison?.degradedReferenceSimilarity != null ? (
        <SimilarityContinuum
          healthySim={restoredRec.comparison.healthyReferenceSimilarity}
          degradedSim={restoredRec.comparison.degradedReferenceSimilarity}
        />
      ) : (
        <div className="card p-4">
          <div className="flex items-center gap-2 text-sm text-charcoal-500">
            <Info className="h-4 w-4" />
            Import Python analysis results to calculate reference similarity.
          </div>
        </div>
      )}

      {(healthyRec || restoredRec || degradedRec) && (
        <FeatureComparisonPanel healthy={healthyRec} restored={restoredRec} degraded={degradedRec} />
      )}
    </div>
  )
}

function RecordingComparisonCard({
  recording,
  accentColor,
  audioRef,
  onTimeUpdate,
  onBufferDecoded,
  segment,
  onSegmentChange,
  onSyncPlay,
  onSyncPause,
  onSyncSeek,
  currentTime,
}: {
  recording: Recording
  accentColor: string
  audioRef: (el: HTMLAudioElement | null) => void
  onTimeUpdate: (t: number) => void
  onBufferDecoded: (buf: AudioBuffer) => void
  segment: SegmentSelection | null
  onSegmentChange: (seg: SegmentSelection | null) => void
  onSyncPlay: () => void
  onSyncPause: () => void
  onSyncSeek: () => void
  currentTime: number
}) {
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null)
  const audioElementRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    audioRef(audioElementRef.current)
    return () => audioRef(null)
  }, [audioRef])

  useEffect(() => {
    if (!recording.file || !recording.objectUrl) return
    let cancelled = false
    const ctx = new AudioContext()
    recording.file.arrayBuffer().then((arr) => {
      if (cancelled) return
      ctx.decodeAudioData(arr).then((buf) => {
        if (cancelled) return
        setBuffer(buf)
        onBufferDecoded(buf)
      }).catch(() => {})
    })
    return () => { cancelled = true; ctx.close() }
  }, [recording.file, recording.objectUrl, onBufferDecoded])

  const duration = recording.browserFeatures?.duration ?? 0

  return (
    <div className="flex flex-col gap-3">
      <AudioPlayer
        src={recording.objectUrl ?? undefined}
        onTimeUpdate={onTimeUpdate}
        audioRef={audioElementRef}
        disabled={!recording.hasAudio}
        disabledNote={recording.audioAssetNote ?? undefined}
        segment={segment}
        onSyncPlay={onSyncPlay}
        onSyncPause={onSyncPause}
        onSyncSeek={onSyncSeek}
      />

      {recording.hasAudio && recording.waveformPeaks && (
        <Waveform
          peaks={recording.waveformPeaks}
          duration={duration}
          audioElement={audioElementRef.current}
          onSegmentChange={onSegmentChange}
          segment={segment}
          accentColor={accentColor}
          height={60}
        />
      )}

      {recording.hasAudio && buffer && (
        <Spectrogram
          audioBuffer={buffer}
          duration={duration}
          segment={segment}
          currentTime={currentTime}
          height={120}
        />
      )}

      {!recording.hasAudio && (
        <div className="rounded-lg bg-sand-50 border border-dashed border-charcoal-200 px-3 py-4 text-center">
          <p className="text-xs text-charcoal-400">No audio loaded for this recording</p>
          {recording.audioAssetNote && <p className="text-[10px] text-charcoal-400 mt-1">{recording.audioAssetNote}</p>}
        </div>
      )}

      <div className="flex flex-col gap-1.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-charcoal-500">Duration</span>
          <span className="font-medium text-charcoal-700 tabular-nums">{duration.toFixed(1)}s</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-charcoal-500">Quality</span>
          <QualityBadge status={recording.quality.status} size="xs" />
        </div>
        <MetricRow label="ACI" value={recording.importedFeatures?.aci} />
        <MetricRow label="Biological-band magnitude ratio (×10)" value={recording.importedFeatures?.bi} />
        <MetricRow label="Bio. freq. occupancy" value={recording.importedFeatures?.biologicalFrequencyOccupancy} />
        <MetricRow label="Anthrop. noise pressure" value={recording.importedFeatures?.anthropogenicNoisePressure} />
        <MetricRow label="Spectral entropy" value={recording.importedFeatures?.spectralEntropy} />
        <MetricRow label="Healthy-ref similarity" value={recording.comparison?.healthyReferenceSimilarity} percent />
      </div>

      {segment && (
        <div className="rounded-lg bg-ocean-50 px-3 py-2">
          <p className="text-[10px] font-medium uppercase text-ocean-700 mb-1">Segment-level browser calculations</p>
          <p className="text-xs text-ocean-800">
            Selected: {segment.startTime.toFixed(1)}s – {segment.endTime.toFixed(1)}s ({(segment.endTime - segment.startTime).toFixed(1)}s)
          </p>
        </div>
      )}
    </div>
  )
}

function MetricRow({ label, value, percent }: { label: string; value: number | null | undefined; percent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-charcoal-500">{label}</span>
      <div className="flex items-center gap-1.5">
        {value != null ? (
          <span className="font-medium text-charcoal-700 tabular-nums">{percent ? `${(value * 100).toFixed(0)}%` : value.toFixed(3)}</span>
        ) : (
          <span className="text-charcoal-300">—</span>
        )}
      </div>
    </div>
  )
}

function SimilarityContinuum({ healthySim, degradedSim }: { healthySim: number; degradedSim: number }) {
  const total = healthySim + degradedSim
  const position = total > 0 ? (healthySim / total) * 100 : 50

  const closerTo = healthySim > degradedSim ? 'healthy reference' : 'degraded comparison'

  return (
    <div className="card p-5">
      <h3 className="section-title mb-4">Similarity Position</h3>
      <div className="text-sm font-medium text-charcoal-700 mb-3">
        Degraded Reference ← Restored Recording → Healthy Reference
      </div>
      <div className="relative h-3 w-full rounded-full bg-gradient-to-r from-rose-300 via-ocean-300 to-forest-500">
        <div
          className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-ocean-600 shadow-md ring-2 ring-ocean-200"
          style={{ left: `${position}%` }}
          aria-label={`Restored recording at ${position.toFixed(0)}% along the continuum`}
        />
      </div>
      <div className="mt-2 flex justify-between text-[10px] font-medium uppercase tracking-wide text-charcoal-400">
        <span>Degraded {(degradedSim * 100).toFixed(0)}%</span>
        <span>Restored</span>
        <span>Healthy {(healthySim * 100).toFixed(0)}%</span>
      </div>
      <p className="mt-4 text-sm text-charcoal-600">
        The selected restored recording is acoustically closer to the {closerTo} than to the{' '}
        {closerTo === 'healthy reference' ? 'degraded comparison' : 'healthy reference'} under the current feature model.
      </p>
    </div>
  )
}

function FeatureComparisonPanel({
  healthy,
  restored,
  degraded,
}: {
  healthy: Recording | undefined
  restored: Recording | undefined
  degraded: Recording | undefined
}) {
  const metrics: { key: string; label: string; tooltip: string }[] = [
    { key: 'aci', label: 'ACI', tooltip: 'Acoustic Complexity Index — captures variation in amplitude across frequency bins. Higher values suggest more acoustic activity but do not directly indicate biodiversity.' },
    { key: 'bi', label: 'Biological-band magnitude ratio (×10)', tooltip: 'Ratio of linear STFT magnitude in the configured biological band to total magnitude, scaled ×10. Not the canonical Bioacoustic Index.' },
    { key: 'biologicalFrequencyOccupancy', label: 'Bio. freq. occupancy', tooltip: 'Proportion of frequency bands occupied by biological sounds. Higher occupancy suggests more diverse acoustic activity.' },
    { key: 'anthropogenicNoisePressure', label: 'Anthrop. noise pressure', tooltip: 'Measure of human-caused noise (boat engines, construction). Higher values indicate more acoustic disturbance.' },
    { key: 'spectralEntropy', label: 'Spectral entropy', tooltip: 'Evenness of energy across the frequency spectrum. Higher entropy suggests a more diverse soundscape but may also indicate noise.' },
  ]

  const getValue = (rec: Recording | undefined, key: string) => {
    if (!rec?.importedFeatures) return null
    return rec.importedFeatures[key as keyof typeof rec.importedFeatures] as number | null
  }

  const getSource = (rec: Recording | undefined) => rec?.metricSource ?? 'prototype'

  return (
    <div className="card p-5">
      <h3 className="section-title mb-1">Acoustic Feature Comparison</h3>
      <p className="text-xs text-charcoal-500 mb-4">
        Higher values are not always ecologically better. Hover over each metric for interpretation guidance.
      </p>
      <div className="flex flex-col gap-4">
        {metrics.map((m) => {
          const values = [getValue(healthy, m.key), getValue(restored, m.key), getValue(degraded, m.key)]
          const maxVal = Math.max(...values.filter((v): v is number => v != null), 0.01)
          return (
            <div key={m.key} className="group relative">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-charcoal-700">{m.label}</span>
                <span className="text-xs text-charcoal-400 cursor-help" title={m.tooltip}>
                  <Info className="h-3 w-3 inline" /> interpretation
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                {[
                  { rec: healthy, label: 'Healthy', color: '#3c7349' },
                  { rec: restored, label: 'Restored', color: '#32729f' },
                  { rec: degraded, label: 'Degraded', color: '#b91c1c' },
                ].map(({ rec, label, color }) => {
                  const val = getValue(rec, m.key)
                  const width = val != null ? (val / maxVal) * 100 : 0
                  return (
                    <div key={label} className="flex items-center gap-2">
                      <span className="w-16 text-xs text-charcoal-500">{label}</span>
                      <div className="flex-1 h-5 rounded-md bg-sand-100 overflow-hidden relative">
                        {val != null ? (
                          <div
                            className="h-full rounded-md transition-all"
                            style={{ width: `${width}%`, backgroundColor: color }}
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-[10px] text-charcoal-400">
                            Analysis not available — import Python pipeline results.
                          </div>
                        )}
                      </div>
                      <span className="w-16 text-right text-xs text-charcoal-600 tabular-nums">
                        {val != null ? val.toFixed(3) : '—'}
                      </span>
                      <span className="w-3 text-[10px] text-charcoal-300" title={getSource(rec)}>
                        {getSource(rec) === 'python' ? 'P' : getSource(rec) === 'browser' ? 'B' : getSource(rec) === 'manual' ? 'M' : 'I'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-4 flex items-center gap-3 text-[10px] text-charcoal-400">
        <span>P = Python imported</span>
        <span>B = Browser calculated</span>
        <span>M = Manual</span>
        <span>I = Prototype illustrative</span>
      </div>
    </div>
  )
}

void HABITAT_LABELS
