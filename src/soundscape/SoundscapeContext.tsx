import { createContext, useContext, useReducer, useEffect, useCallback, useRef, type ReactNode } from 'react'
import type {
  Recording,
  ProjectInfo,
  AppSettings,
  ComparisonSelections,
  QualityAssessment,
  HabitatCategory,
  ImportedRecordEntry,
  AnalysisImport,
  MetricSource,
} from './types'
import { DEFAULT_SETTINGS, DEFAULT_THRESHOLDS } from './types'
import { createQualityAssessment, generateId } from './audioUtils'
import { demoProject } from './demoData'

export interface SoundscapeState {
  recordings: Recording[]
  project: ProjectInfo
  settings: AppSettings
  selections: ComparisonSelections
  activeTab: string
  selectedRecordingId: string | null
}

type Action =
  | { type: 'ADD_RECORDING'; recording: Recording }
  | { type: 'UPDATE_RECORDING'; id: string; updates: Partial<Recording> }
  | { type: 'UPDATE_METADATA'; id: string; updates: Partial<Recording['metadata']> }
  | { type: 'UPDATE_QUALITY'; id: string; updates: Partial<QualityAssessment> }
  | { type: 'REMOVE_RECORDING'; id: string }
  | { type: 'BATCH_UPDATE_HABITAT'; ids: string[]; habitat: HabitatCategory }
  | { type: 'BATCH_MARK_REVIEW'; ids: string[] }
  | { type: 'BATCH_EXCLUDE'; ids: string[] }
  | { type: 'BATCH_REMOVE'; ids: string[] }
  | { type: 'SET_BROWSER_FEATURES'; id: string; features: Recording['browserFeatures']; waveformPeaks: number[]; loadStatus: Recording['loadStatus'] }
  | { type: 'SET_LOAD_STATUS'; id: string; status: Recording['loadStatus']; error?: string | null }
  | { type: 'APPLY_IMPORT'; importData: AnalysisImport; mode: 'replace' | 'merge' }
  | { type: 'MATCH_IMPORTED'; recordingId: string; importedId: string }
  | { type: 'SET_SELECTIONS'; selections: Partial<ComparisonSelections> }
  | { type: 'SET_SETTINGS'; settings: Partial<AppSettings> }
  | { type: 'SET_THRESHOLDS'; thresholds: Partial<typeof DEFAULT_THRESHOLDS> }
  | { type: 'SET_TAB'; tab: string }
  | { type: 'SET_SELECTED_RECORDING'; id: string | null }
  | { type: 'LOAD_DEMO'; recordings: Recording[] }
  | { type: 'LOAD_STATE'; state: Partial<SoundscapeState> }
  | { type: 'CLEAR_ALL' }

const STORAGE_KEY = 'acoustimap_soundscape_state_v1'

function getInitialState(): SoundscapeState {
  return {
    recordings: [],
    project: demoProject,
    settings: DEFAULT_SETTINGS,
    selections: { healthy: null, restored: null, degraded: null },
    activeTab: 'compare',
    selectedRecordingId: null,
  }
}

function reducer(state: SoundscapeState, action: Action): SoundscapeState {
  switch (action.type) {
    case 'ADD_RECORDING':
      return { ...state, recordings: [...state.recordings, action.recording] }

    case 'UPDATE_RECORDING':
      return {
        ...state,
        recordings: state.recordings.map((r) =>
          r.id === action.id ? { ...r, ...action.updates } : r,
        ),
      }

    case 'UPDATE_METADATA':
      return {
        ...state,
        recordings: state.recordings.map((r) =>
          r.id === action.id ? { ...r, metadata: { ...r.metadata, ...action.updates } } : r,
        ),
      }

    case 'UPDATE_QUALITY':
      return {
        ...state,
        recordings: state.recordings.map((r) =>
          r.id === action.id ? { ...r, quality: { ...r.quality, ...action.updates } } : r,
        ),
      }

    case 'REMOVE_RECORDING': {
      const rec = state.recordings.find((r) => r.id === action.id)
      if (rec?.objectUrl) URL.revokeObjectURL(rec.objectUrl)
      return {
        ...state,
        recordings: state.recordings.filter((r) => r.id !== action.id),
        selections: {
          healthy: state.selections.healthy === action.id ? null : state.selections.healthy,
          restored: state.selections.restored === action.id ? null : state.selections.restored,
          degraded: state.selections.degraded === action.id ? null : state.selections.degraded,
        },
        selectedRecordingId: state.selectedRecordingId === action.id ? null : state.selectedRecordingId,
      }
    }

    case 'BATCH_UPDATE_HABITAT':
      return {
        ...state,
        recordings: state.recordings.map((r) =>
          action.ids.includes(r.id) ? { ...r, metadata: { ...r.metadata, habitatCategory: action.habitat } } : r,
        ),
      }

    case 'BATCH_MARK_REVIEW':
      return {
        ...state,
        recordings: state.recordings.map((r) =>
          action.ids.includes(r.id) ? { ...r, quality: { ...r.quality, status: 'review' } } : r,
        ),
      }

    case 'BATCH_EXCLUDE':
      return {
        ...state,
        recordings: state.recordings.map((r) =>
          action.ids.includes(r.id)
            ? { ...r, quality: { ...r.quality, status: 'excluded', exclusionReason: r.quality.exclusionReason ?? 'manual_exclusion' } }
            : r,
        ),
      }

    case 'BATCH_REMOVE': {
      for (const id of action.ids) {
        const rec = state.recordings.find((r) => r.id === id)
        if (rec?.objectUrl) URL.revokeObjectURL(rec.objectUrl)
      }
      const removedSet = new Set(action.ids)
      return {
        ...state,
        recordings: state.recordings.filter((r) => !removedSet.has(r.id)),
        selections: {
          healthy: state.selections.healthy && !removedSet.has(state.selections.healthy) ? state.selections.healthy : null,
          restored: state.selections.restored && !removedSet.has(state.selections.restored) ? state.selections.restored : null,
          degraded: state.selections.degraded && !removedSet.has(state.selections.degraded) ? state.selections.degraded : null,
        },
      }
    }

    case 'SET_BROWSER_FEATURES':
      return {
        ...state,
        recordings: state.recordings.map((r) =>
          r.id === action.id
            ? {
                ...r,
                browserFeatures: action.features,
                waveformPeaks: action.waveformPeaks,
                loadStatus: action.loadStatus,
                quality: createQualityAssessment(action.features, state.settings.qualityThresholds, r.quality),
              }
            : r,
        ),
      }

    case 'SET_LOAD_STATUS':
      return {
        ...state,
        recordings: state.recordings.map((r) =>
          r.id === action.id ? { ...r, loadStatus: action.status, loadError: action.error ?? null } : r,
        ),
      }

    case 'APPLY_IMPORT': {
      const importedMap = new Map<string, ImportedRecordEntry>()
      for (const rec of action.importData.recordings) {
        importedMap.set(rec.recordingId, rec)
      }

      if (action.mode === 'replace') {
        const newRecordings: Recording[] = action.importData.recordings.map((entry) => {
          const existing = state.recordings.find((r) => r.id === entry.recordingId)
          return applyImportedEntry(entry, existing, state.settings.qualityThresholds)
        })
        return { ...state, recordings: newRecordings }
      }

      const recordings = [...state.recordings]
      for (const entry of action.importData.recordings) {
        const idx = recordings.findIndex(
          (r) => r.id === entry.recordingId || (entry.filename && r.metadata.filename === entry.filename),
        )
        if (idx >= 0) {
          recordings[idx] = applyImportedEntry(entry, recordings[idx], state.settings.qualityThresholds)
        } else {
          recordings.push(applyImportedEntry(entry, undefined, state.settings.qualityThresholds))
        }
      }
      return { ...state, recordings }
    }

    case 'MATCH_IMPORTED': {
      return {
        ...state,
        recordings: state.recordings.map((r) =>
          r.id === action.recordingId
            ? {
                ...r,
                matchedImportedId: action.importedId,
                metricSource: 'manual' as MetricSource,
              }
            : r,
        ),
      }
    }

    case 'SET_SELECTIONS':
      return { ...state, selections: { ...state.selections, ...action.selections } }

    case 'SET_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.settings } }

    case 'SET_THRESHOLDS':
      return {
        ...state,
        settings: {
          ...state.settings,
          qualityThresholds: { ...state.settings.qualityThresholds, ...action.thresholds },
        },
      }

    case 'SET_TAB':
      return { ...state, activeTab: action.tab }

    case 'SET_SELECTED_RECORDING':
      return { ...state, selectedRecordingId: action.id }

    case 'LOAD_DEMO':
      return { ...state, recordings: action.recordings }

    case 'LOAD_STATE':
      return { ...state, ...action.state }

    case 'CLEAR_ALL': {
      for (const r of state.recordings) {
        if (r.objectUrl) URL.revokeObjectURL(r.objectUrl)
      }
      return { ...getInitialState() }
    }

    default:
      return state
  }
}

function applyImportedEntry(
  entry: ImportedRecordEntry,
  existing: Recording | undefined,
  thresholds: typeof DEFAULT_THRESHOLDS,
): Recording {
  void thresholds
  const importedFeatures = {
    aci: entry.features.aci,
    bi: entry.features.bi,
    biologicalFrequencyOccupancy: entry.features.biologicalFrequencyOccupancy,
    anthropogenicNoisePressure: entry.features.anthropogenicNoisePressure,
    spectralEntropy: entry.features.spectralEntropy,
  }
  const comparison = {
    healthyReferenceSimilarity: entry.comparison.healthyReferenceSimilarity,
    degradedReferenceSimilarity: entry.comparison.degradedReferenceSimilarity,
  }
  const importedQuality = {
    status: entry.quality.status,
    noiseFlag: entry.quality.noiseFlag,
    clippingFlag: entry.quality.clippingFlag,
    exclusionReason: entry.quality.exclusionReason,
  }
  const isExcluded = entry.quality.status === 'excluded' || entry.quality.exclusionReason !== null

  if (existing) {
    return {
      ...existing,
      importedFeatures,
      comparison,
      importedQuality,
      metricSource: 'python',
      matchedImportedId: entry.recordingId,
      quality: {
        ...existing.quality,
        status: isExcluded ? 'excluded' : existing.quality.status,
        exclusionReason: isExcluded ? 'pipeline_contaminated' : existing.quality.exclusionReason,
      },
    }
  }

  return {
    id: entry.recordingId,
    metadata: {
      id: entry.recordingId,
      name: entry.recordingId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      filename: entry.filename ?? `${entry.recordingId}.wav`,
      habitatCategory: entry.habitatCategory as HabitatCategory,
      site: entry.siteId ?? 'Unknown',
      timestamp: entry.timestamp ?? new Date().toISOString(),
      monitoringPeriod: 'January–June 2026',
      recorderId: 'hydrophone_' + (entry.siteId ?? 'unknown'),
      notes: isExcluded ? 'Python pipeline flagged this recording.' : '',
    },
    file: null,
    objectUrl: null,
    fileSize: 0,
    fileType: 'audio/wav',
    loadStatus: 'no_audio',
    loadError: null,
    browserFeatures: null,
    importedFeatures,
    comparison,
    importedQuality,
    quality: {
      status: isExcluded ? 'excluded' : 'good',
      exclusionReason: isExcluded ? 'pipeline_contaminated' : null,
      reviewerNotes: '',
      warnings: [],
      autoRecommendation: isExcluded ? 'exclude' : 'keep',
    },
    metricSource: 'python',
    waveformPeaks: null,
    hasAudio: false,
    audioAssetNote: 'Audio asset not included in prototype repository',
    matchedImportedId: entry.recordingId,
  }
}

interface SoundscapeContextValue {
  state: SoundscapeState
  dispatch: React.Dispatch<Action>
  addRecording: (file: File, metadata: Partial<Recording['metadata']>) => string
  removeRecording: (id: string) => void
  updateMetadata: (id: string, updates: Partial<Recording['metadata']>) => void
  updateQuality: (id: string, updates: Partial<QualityAssessment>) => void
  setBrowserFeatures: (id: string, features: Recording['browserFeatures'], waveformPeaks: number[]) => void
  setLoadStatus: (id: string, status: Recording['loadStatus'], error?: string | null) => void
  applyImport: (importData: AnalysisImport, mode: 'replace' | 'merge') => void
  matchImported: (recordingId: string, importedId: string) => void
  setSelections: (selections: Partial<ComparisonSelections>) => void
  setSettings: (settings: Partial<AppSettings>) => void
  setThresholds: (thresholds: Partial<typeof DEFAULT_THRESHOLDS>) => void
  setTab: (tab: string) => void
  setSelectedRecording: (id: string | null) => void
  loadDemo: (recordings: Recording[]) => void
  clearAll: () => void
}

const SoundscapeContext = createContext<SoundscapeContextValue | null>(null)

export function SoundscapeProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, getInitialState)
  const hydratedRef = useRef(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<SoundscapeState>
        const recordings = (parsed.recordings ?? []).map((r) => ({
          ...r,
          file: null,
          objectUrl: null,
          loadStatus: r.hasAudio ? 'pending' : r.loadStatus,
          waveformPeaks: null,
        }))
        dispatch({
          type: 'LOAD_STATE',
          state: {
            ...parsed,
            recordings,
            settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
          },
        })
      }
    } catch (e) {
      console.error('Failed to load soundscape state from localStorage:', e)
    }
    hydratedRef.current = true
  }, [])

  useEffect(() => {
    if (!hydratedRef.current) return
    try {
      const serializable: SoundscapeState = {
        ...state,
        recordings: state.recordings.map((r) => {
          const { file: _f, objectUrl: _o, waveformPeaks: _w, ...rest } = r
          void _f
          void _o
          void _w
          return rest
        }) as Recording[],
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable))
    } catch (e) {
      console.error('Failed to save soundscape state to localStorage:', e)
    }
  }, [state])

  const addRecording = useCallback((file: File, metadata: Partial<Recording['metadata']>) => {
    const id = generateId()
    const objectUrl = URL.createObjectURL(file)
    const recording: Recording = {
      id,
      metadata: {
        id,
        name: metadata.name ?? file.name.replace(/\.[^/.]+$/, ''),
        filename: file.name,
        habitatCategory: metadata.habitatCategory ?? 'restored',
        site: metadata.site ?? '',
        timestamp: metadata.timestamp ?? new Date().toISOString(),
        monitoringPeriod: metadata.monitoringPeriod ?? 'January–June 2026',
        recorderId: metadata.recorderId ?? '',
        notes: metadata.notes ?? '',
      },
      file,
      objectUrl,
      fileSize: file.size,
      fileType: file.type || 'unknown',
      loadStatus: 'pending',
      loadError: null,
      browserFeatures: null,
      importedFeatures: null,
      comparison: null,
      importedQuality: null,
      quality: {
        status: 'review',
        exclusionReason: null,
        reviewerNotes: '',
        warnings: [],
        autoRecommendation: 'review',
      },
      metricSource: 'browser',
      waveformPeaks: null,
      hasAudio: true,
      audioAssetNote: null,
      matchedImportedId: null,
    }
    dispatch({ type: 'ADD_RECORDING', recording })
    return id
  }, [])

  const removeRecording = useCallback((id: string) => dispatch({ type: 'REMOVE_RECORDING', id }), [])
  const updateMetadata = useCallback((id: string, updates: Partial<Recording['metadata']>) => dispatch({ type: 'UPDATE_METADATA', id, updates }), [])
  const updateQuality = useCallback((id: string, updates: Partial<QualityAssessment>) => dispatch({ type: 'UPDATE_QUALITY', id, updates }), [])
  const setBrowserFeatures = useCallback((id: string, features: Recording['browserFeatures'], waveformPeaks: number[]) => dispatch({ type: 'SET_BROWSER_FEATURES', id, features, waveformPeaks, loadStatus: 'ready' }), [])
  const setLoadStatus = useCallback((id: string, status: Recording['loadStatus'], error?: string | null) => dispatch({ type: 'SET_LOAD_STATUS', id, status, error }), [])
  const applyImport = useCallback((importData: AnalysisImport, mode: 'replace' | 'merge') => dispatch({ type: 'APPLY_IMPORT', importData, mode }), [])
  const matchImported = useCallback((recordingId: string, importedId: string) => dispatch({ type: 'MATCH_IMPORTED', recordingId, importedId }), [])
  const setSelections = useCallback((selections: Partial<ComparisonSelections>) => dispatch({ type: 'SET_SELECTIONS', selections }), [])
  const setSettings = useCallback((settings: Partial<AppSettings>) => dispatch({ type: 'SET_SETTINGS', settings }), [])
  const setThresholds = useCallback((thresholds: Partial<typeof DEFAULT_THRESHOLDS>) => dispatch({ type: 'SET_THRESHOLDS', thresholds }), [])
  const setTab = useCallback((tab: string) => dispatch({ type: 'SET_TAB', tab }), [])
  const setSelectedRecording = useCallback((id: string | null) => dispatch({ type: 'SET_SELECTED_RECORDING', id }), [])
  const loadDemo = useCallback((recordings: Recording[]) => dispatch({ type: 'LOAD_DEMO', recordings }), [])
  const clearAll = useCallback(() => dispatch({ type: 'CLEAR_ALL' }), [])

  return (
    <SoundscapeContext.Provider
      value={{
        state,
        dispatch,
        addRecording,
        removeRecording,
        updateMetadata,
        updateQuality,
        setBrowserFeatures,
        setLoadStatus,
        applyImport,
        matchImported,
        setSelections,
        setSettings,
        setThresholds,
        setTab,
        setSelectedRecording,
        loadDemo,
        clearAll,
      }}
    >
      {children}
    </SoundscapeContext.Provider>
  )
}

export function useSoundscape() {
  const ctx = useContext(SoundscapeContext)
  if (!ctx) throw new Error('useSoundscape must be used within SoundscapeProvider')
  return ctx
}
