import type { Recording, AnalysisImport, ProjectInfo } from './types'
import { DEFAULT_THRESHOLDS } from './types'

export const demoProject: ProjectInfo = {
  id: 'mars-coral-restore',
  name: 'Mars Coral Reef Restoration',
  ecosystem: 'Coral reef',
  location: 'South Sulawesi, Indonesia',
  monitoringPeriod: 'January–June 2026',
}

export const demoAnalysisImport: AnalysisImport = {
  schemaVersion: '1.0',
  project: {
    id: 'mars-coral-restore',
    name: 'Mars Coral Reef Restoration',
    ecosystem: 'coral_reef',
    location: 'South Sulawesi, Indonesia',
  },
  recordings: [
    {
      recordingId: 'healthy_001',
      filename: 'healthy_001.wav',
      siteId: 'healthy_ref_a',
      habitatCategory: 'healthy',
      timestamp: '2026-02-14T06:00:00Z',
      quality: { status: 'valid', noiseFlag: false, clippingFlag: false, exclusionReason: null },
      features: { aci: 0.82, bi: 7.9, biologicalFrequencyOccupancy: 0.78, anthropogenicNoisePressure: 0.12, spectralEntropy: 0.79 },
      comparison: { healthyReferenceSimilarity: 1.0, degradedReferenceSimilarity: 0.44 },
    },
    {
      recordingId: 'healthy_002',
      filename: 'healthy_002.wav',
      siteId: 'healthy_ref_a',
      habitatCategory: 'healthy',
      timestamp: '2026-03-10T06:30:00Z',
      quality: { status: 'valid', noiseFlag: false, clippingFlag: false, exclusionReason: null },
      features: { aci: 0.80, bi: 7.6, biologicalFrequencyOccupancy: 0.75, anthropogenicNoisePressure: 0.14, spectralEntropy: 0.77 },
      comparison: { healthyReferenceSimilarity: 0.98, degradedReferenceSimilarity: 0.46 },
    },
    {
      recordingId: 'healthy_003',
      filename: 'healthy_003.wav',
      siteId: 'healthy_ref_b',
      habitatCategory: 'healthy',
      timestamp: '2026-04-05T05:45:00Z',
      quality: { status: 'valid', noiseFlag: false, clippingFlag: false, exclusionReason: null },
      features: { aci: 0.81, bi: 7.8, biologicalFrequencyOccupancy: 0.76, anthropogenicNoisePressure: 0.13, spectralEntropy: 0.78 },
      comparison: { healthyReferenceSimilarity: 0.99, degradedReferenceSimilarity: 0.45 },
    },
    {
      recordingId: 'restored_001',
      filename: 'restored_001.wav',
      siteId: 'restored_site_a',
      habitatCategory: 'restored',
      timestamp: '2026-02-14T06:15:00Z',
      quality: { status: 'valid', noiseFlag: false, clippingFlag: false, exclusionReason: null },
      features: { aci: 0.69, bi: 6.8, biologicalFrequencyOccupancy: 0.66, anthropogenicNoisePressure: 0.31, spectralEntropy: 0.72 },
      comparison: { healthyReferenceSimilarity: 0.81, degradedReferenceSimilarity: 0.49 },
    },
    {
      recordingId: 'restored_002',
      filename: 'restored_002.wav',
      siteId: 'restored_site_a',
      habitatCategory: 'restored',
      timestamp: '2026-03-10T06:45:00Z',
      quality: { status: 'valid', noiseFlag: false, clippingFlag: false, exclusionReason: null },
      features: { aci: 0.71, bi: 6.5, biologicalFrequencyOccupancy: 0.63, anthropogenicNoisePressure: 0.28, spectralEntropy: 0.70 },
      comparison: { healthyReferenceSimilarity: 0.79, degradedReferenceSimilarity: 0.51 },
    },
    {
      recordingId: 'restored_003',
      filename: 'restored_003.wav',
      siteId: 'restored_site_b',
      habitatCategory: 'restored',
      timestamp: '2026-04-05T06:00:00Z',
      quality: { status: 'valid', noiseFlag: true, clippingFlag: false, exclusionReason: null },
      features: { aci: 0.66, bi: 6.2, biologicalFrequencyOccupancy: 0.61, anthropogenicNoisePressure: 0.35, spectralEntropy: 0.69 },
      comparison: { healthyReferenceSimilarity: 0.76, degradedReferenceSimilarity: 0.53 },
    },
    {
      recordingId: 'restored_004',
      filename: 'restored_004.wav',
      siteId: 'restored_site_b',
      habitatCategory: 'restored',
      timestamp: '2026-05-12T06:20:00Z',
      quality: { status: 'valid', noiseFlag: false, clippingFlag: false, exclusionReason: null },
      features: { aci: 0.73, bi: 7.1, biologicalFrequencyOccupancy: 0.68, anthropogenicNoisePressure: 0.25, spectralEntropy: 0.74 },
      comparison: { healthyReferenceSimilarity: 0.84, degradedReferenceSimilarity: 0.47 },
    },
    {
      recordingId: 'restored_005',
      filename: 'restored_005.wav',
      siteId: 'restored_site_a',
      habitatCategory: 'restored',
      timestamp: '2026-05-20T06:10:00Z',
      quality: { status: 'valid', noiseFlag: false, clippingFlag: false, exclusionReason: null },
      features: { aci: 0.70, bi: 6.7, biologicalFrequencyOccupancy: 0.65, anthropogenicNoisePressure: 0.30, spectralEntropy: 0.71 },
      comparison: { healthyReferenceSimilarity: 0.82, degradedReferenceSimilarity: 0.50 },
    },
    {
      recordingId: 'degraded_001',
      filename: 'degraded_001.wav',
      siteId: 'degraded_site_a',
      habitatCategory: 'degraded',
      timestamp: '2026-02-14T06:30:00Z',
      quality: { status: 'valid', noiseFlag: false, clippingFlag: false, exclusionReason: null },
      features: { aci: 0.43, bi: 4.1, biologicalFrequencyOccupancy: 0.39, anthropogenicNoisePressure: 0.45, spectralEntropy: 0.58 },
      comparison: { healthyReferenceSimilarity: 0.44, degradedReferenceSimilarity: 1.0 },
    },
    {
      recordingId: 'degraded_002',
      filename: 'degraded_002.wav',
      siteId: 'degraded_site_a',
      habitatCategory: 'degraded',
      timestamp: '2026-03-10T07:00:00Z',
      quality: { status: 'valid', noiseFlag: true, clippingFlag: false, exclusionReason: null },
      features: { aci: 0.45, bi: 4.3, biologicalFrequencyOccupancy: 0.41, anthropogenicNoisePressure: 0.48, spectralEntropy: 0.60 },
      comparison: { healthyReferenceSimilarity: 0.46, degradedReferenceSimilarity: 0.97 },
    },
    {
      recordingId: 'degraded_003',
      filename: 'degraded_003.wav',
      siteId: 'degraded_site_b',
      habitatCategory: 'degraded',
      timestamp: '2026-04-05T06:15:00Z',
      quality: { status: 'excluded', noiseFlag: true, clippingFlag: true, exclusionReason: 'boat_noise_contamination' },
      features: { aci: 0.41, bi: 3.9, biologicalFrequencyOccupancy: 0.37, anthropogenicNoisePressure: 0.52, spectralEntropy: 0.55 },
      comparison: { healthyReferenceSimilarity: 0.43, degradedReferenceSimilarity: 0.98 },
    },
  ],
  summary: {
    acousticRecoveryScore: 74,
    healthyReferenceSimilarity: 0.81,
    improvementOverDegradedBaseline: 0.31,
    evidenceConsistency: 0.82,
    confidenceLabel: 'Moderate–High',
  },
}

export function createDemoRecordings(): Recording[] {
  return demoAnalysisImport.recordings.map((entry) => {
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

    return {
      id: entry.recordingId,
      metadata: {
        id: entry.recordingId,
        name: entry.recordingId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        filename: entry.filename ?? `${entry.recordingId}.wav`,
        habitatCategory: entry.habitatCategory as Recording['metadata']['habitatCategory'],
        site: entry.siteId ?? 'Unknown',
        timestamp: entry.timestamp ?? new Date().toISOString(),
        monitoringPeriod: 'January–June 2026',
        recorderId: 'hydrophone_' + entry.siteId,
        notes: isExcluded ? 'Python pipeline flagged this recording.' : '',
      },
      file: null,
      objectUrl: null,
      fileSize: 0,
      fileType: 'audio/wav',
      loadStatus: 'no_audio' as const,
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
  })
}

void DEFAULT_THRESHOLDS
