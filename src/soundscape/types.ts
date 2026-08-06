export type HabitatCategory = 'healthy' | 'restored' | 'degraded'

export type MetricSource = 'browser' | 'python' | 'manual' | 'prototype'

export type QualityStatus = 'good' | 'review' | 'excluded'

export type ExclusionReason =
  | 'excessive_clipping'
  | 'near_silence'
  | 'short_duration'
  | 'inconsistent_sample_rate'
  | 'low_frequency_noise'
  | 'missing_metadata'
  | 'pipeline_contaminated'
  | 'manual_exclusion'
  | null

export interface BrowserAudioFeatures {
  duration: number
  peakAmplitude: number
  rmsAmplitude: number
  dynamicRange: number
  zeroCrossingRate: number
  clippingPercent: number
  silenceProportion: number
  lowFreqEnergy: number
  midFreqEnergy: number
  highFreqEnergy: number
  sampleRate: number
  channels: number
}

export interface ImportedAcousticFeatures {
  aci: number | null
  bi: number | null
  biologicalFrequencyOccupancy: number | null
  anthropogenicNoisePressure: number | null
  spectralEntropy: number | null
}

export interface ComparisonResult {
  healthyReferenceSimilarity: number | null
  degradedReferenceSimilarity: number | null
}

export interface ImportedQualityInfo {
  status: string | null
  noiseFlag: boolean | null
  clippingFlag: boolean | null
  exclusionReason: string | null
}

export interface QualityAssessment {
  status: QualityStatus
  exclusionReason: ExclusionReason
  reviewerNotes: string
  warnings: string[]
  autoRecommendation: 'keep' | 'review' | 'exclude'
}

export interface RecordingMetadata {
  id: string
  name: string
  filename: string
  habitatCategory: HabitatCategory
  site: string
  timestamp: string
  monitoringPeriod: string
  recorderId: string
  notes: string
}

export interface Recording {
  id: string
  metadata: RecordingMetadata
  file: File | null
  objectUrl: string | null
  fileSize: number
  fileType: string
  loadStatus: 'pending' | 'decoding' | 'ready' | 'error' | 'no_audio'
  loadError: string | null
  browserFeatures: BrowserAudioFeatures | null
  importedFeatures: ImportedAcousticFeatures | null
  comparison: ComparisonResult | null
  importedQuality: ImportedQualityInfo | null
  quality: QualityAssessment
  metricSource: MetricSource
  waveformPeaks: number[] | null
  hasAudio: boolean
  audioAssetNote: string | null
  matchedImportedId: string | null
}

export interface ProjectInfo {
  id: string
  name: string
  ecosystem: string
  location: string
  monitoringPeriod: string
}

export interface AnalysisImport {
  schemaVersion: string
  project: {
    id: string
    name: string
    ecosystem: string
    location: string
  }
  recordings: ImportedRecordEntry[]
  summary: {
    acousticRecoveryScore: number
    healthyReferenceSimilarity: number
    improvementOverDegradedBaseline: number
    evidenceConsistency: number
    confidenceLabel: string
  }
}

export interface ImportedRecordEntry {
  recordingId: string
  filename: string | null
  siteId: string | null
  habitatCategory: string
  timestamp: string | null
  quality: {
    status: string | null
    noiseFlag: boolean | null
    clippingFlag: boolean | null
    exclusionReason: string | null
  }
  features: {
    aci: number | null
    bi: number | null
    biologicalFrequencyOccupancy: number | null
    anthropogenicNoisePressure: number | null
    spectralEntropy: number | null
  }
  comparison: {
    healthyReferenceSimilarity: number | null
    degradedReferenceSimilarity: number | null
  }
}

export interface ValidationError {
  field: string
  recordingId: string | null
  expected: string
  actual: string
  message: string
  suggestion: string
}

export interface ValidationReport {
  valid: boolean
  errors: ValidationError[]
  warnings: string[]
  validRecordCount: number
  totalRecordCount: number
}

export interface QualityThresholds {
  clippingPercent: number
  silenceProportion: number
  minRms: number
  minDuration: number
  maxDuration: number
  lowFreqNoiseRatio: number
}

export interface ComparisonSelections {
  healthy: string | null
  restored: string | null
  degraded: string | null
}

export interface AppSettings {
  syncPlayback: boolean
  compareEquivalentSegments: boolean
  fftSize: number
  freqMax: number
  contrast: number
  qualityThresholds: QualityThresholds
}

export interface ExportData {
  schemaVersion: string
  exportedAt: string
  project: ProjectInfo
  recordings: ExportRecording[]
  comparisonSelections: ComparisonSelections
  settings: AppSettings
}

export interface ExportRecording {
  id: string
  metadata: RecordingMetadata
  fileSize: number
  fileType: string
  browserFeatures: BrowserAudioFeatures | null
  importedFeatures: ImportedAcousticFeatures | null
  comparison: ComparisonResult | null
  quality: QualityAssessment
  metricSource: MetricSource
  matchedImportedId: string | null
}

export interface SegmentSelection {
  startTime: number
  endTime: number
}

export const HABITAT_LABELS: Record<HabitatCategory, string> = {
  healthy: 'Healthy Reference',
  restored: 'Restored Site',
  degraded: 'Degraded Comparison',
}

export const QUALITY_LABELS: Record<QualityStatus, string> = {
  good: 'Good',
  review: 'Review recommended',
  excluded: 'Excluded',
}

export const EXCLUSION_LABELS: Record<NonNullable<ExclusionReason>, string> = {
  excessive_clipping: 'Excessive clipping',
  near_silence: 'Near silence',
  short_duration: 'Short duration',
  inconsistent_sample_rate: 'Inconsistent sample rate',
  low_frequency_noise: 'High low-frequency noise',
  missing_metadata: 'Missing metadata',
  pipeline_contaminated: 'Python pipeline marked recording as contaminated',
  manual_exclusion: 'Manual exclusion',
}

export const DEFAULT_THRESHOLDS: QualityThresholds = {
  clippingPercent: 0.5,
  silenceProportion: 0.6,
  minRms: 0.005,
  minDuration: 5,
  maxDuration: 600,
  lowFreqNoiseRatio: 0.7,
}

export const DEFAULT_SETTINGS: AppSettings = {
  syncPlayback: false,
  compareEquivalentSegments: false,
  fftSize: 2048,
  freqMax: 22050,
  contrast: 1.0,
  qualityThresholds: DEFAULT_THRESHOLDS,
}
