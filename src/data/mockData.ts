export type TrendDirection = 'up' | 'down' | 'flat'

export interface Metric {
  id: string
  title: string
  value: string
  supportingValue?: string
  change?: string
  status: string
  statusTone: 'positive' | 'neutral' | 'warning' | 'info'
  trend?: TrendDirection
  tooltip: string
  /** 0–100 numeric score for the circular progress visual (recovery score only) */
  progress?: number
  /** secondary breakdown for compact visuals (recordings: valid/excluded) */
  breakdown?: { label: string; value: number; tone: 'positive' | 'warning' }[]
}

export interface TrajectoryPoint {
  period: string
  restored: number
  degraded: number
  healthy: number
  /** lower bound of restored confidence band */
  restoredLow: number
  /** upper bound of restored confidence band */
  restoredHigh: number
}

export interface AcousticEvidence {
  label: string
  habitat: string
  tone: 'healthy' | 'restored' | 'degraded'
  acousticComplexityIndex: number
  bioacousticIndex: number
  biologicalFrequencyOccupancy: number
  humanNoisePressure: 'Low' | 'Moderate' | 'High'
  similarityToHealthy: number
}

export interface AlertItem {
  id: string
  type: 'info' | 'positive' | 'warning' | 'device'
  message: string
  timestamp: string
}

export interface SiteStatus {
  id: string
  name: string
  role: string
  markerShape: 'circle' | 'square' | 'triangle'
  recorderStatus: 'Online' | 'Offline' | 'Delayed'
  statusDetail: string
}

export interface ProjectSummary {
  name: string
  location: string
  monitoringPeriods: string[]
  activePeriod: string
  monitoringDateRange: string
  lastUpdated: string
}

export const project: ProjectSummary = {
  name: 'Mars Coral Reef Restoration',
  location: 'South Sulawesi, Indonesia',
  monitoringPeriods: [
    'Period 1',
    'Period 2',
    'Period 3',
    'Period 4',
    'Period 5',
    'Period 6',
  ],
  activePeriod: 'Period 6',
  monitoringDateRange: 'January–June 2026',
  lastUpdated: '3 hours ago',
}

export const overviewInterpretation =
  'Acoustic activity at the restored reef is becoming more similar to the healthy reference reef. Current evidence suggests positive acoustic recovery, although continued ecological monitoring is required.'

export const recoveryScoreValue = 74
export const recoveryScoreMax = 100

export const metrics: Metric[] = [
  {
    id: 'recovery-score',
    title: 'Acoustic Recovery Score',
    value: '74/100',
    change: '+8 since previous monitoring period',
    status: 'Positive recovery',
    statusTone: 'positive',
    trend: 'up',
    progress: 74,
    tooltip:
      'Measures how closely the restored site’s acoustic profile resembles the healthy local reference. It is not a measure of total biodiversity.',
  },
  {
    id: 'momentum',
    title: 'Recovery Momentum',
    value: 'Improving',
    supportingValue: '+3.4 points per monitoring period',
    status: 'Positive for three consecutive periods',
    statusTone: 'positive',
    trend: 'up',
    tooltip:
      'The average rate of change in the recovery score across recent monitoring periods. A positive value means the soundscape is moving toward the reference.',
  },
  {
    id: 'confidence',
    title: 'Confidence',
    value: 'Moderate–High',
    supportingValue: '82% evidence consistency',
    status: 'Based on 91 valid recordings',
    statusTone: 'info',
    tooltip:
      'How consistently the underlying acoustic indicators agree with each other. Higher consistency means the score is less likely to be driven by a single noisy metric.',
  },
  {
    id: 'recordings',
    title: 'Recordings Analysed',
    value: '96',
    supportingValue: '91 valid · 5 excluded',
    status: '5 excluded',
    statusTone: 'neutral',
    breakdown: [
      { label: 'Valid', value: 91, tone: 'positive' },
      { label: 'Excluded', value: 5, tone: 'warning' },
    ],
    tooltip:
      'Total audio recordings processed this period. Recordings are excluded when boat noise, equipment faults, or storm conditions make them unusable.',
  },
  {
    id: 'coverage',
    title: 'Monitoring Coverage',
    value: '84 days',
    supportingValue: '92% scheduled coverage',
    status: 'Three active monitoring locations',
    statusTone: 'positive',
    tooltip:
      'The number of days with usable recordings out of the planned monitoring window. Gaps are usually caused by equipment downtime or severe weather.',
  },
]

export const trajectory: TrajectoryPoint[] = [
  { period: 'Period 1', restored: 41, degraded: 38, healthy: 88, restoredLow: 36, restoredHigh: 46 },
  { period: 'Period 2', restored: 46, degraded: 39, healthy: 89, restoredLow: 41, restoredHigh: 51 },
  { period: 'Period 3', restored: 53, degraded: 40, healthy: 90, restoredLow: 48, restoredHigh: 58 },
  { period: 'Period 4', restored: 61, degraded: 41, healthy: 90, restoredLow: 56, restoredHigh: 66 },
  { period: 'Period 5', restored: 68, degraded: 42, healthy: 91, restoredLow: 63, restoredHigh: 73 },
  { period: 'Period 6', restored: 74, degraded: 42, healthy: 92, restoredLow: 69, restoredHigh: 79 },
]

export const interventionPeriodIndex = 1 // structures installed between Period 1 and Period 2

/** Index of the period where restored reef begins moving clearly away from degraded baseline */
export const divergencePeriodIndex = 2 // Period 3

export const recoveryGap = {
  currentDistanceFromHealthy: 19,
  improvementFromDegradedBaseline: 31,
  previousPeriodGap: 27,
  explanation:
    'The restored reef has moved closer to the healthy acoustic reference while continuing to remain distinct from it.',
}

export const acousticEvidence: AcousticEvidence[] = [
  {
    label: 'Healthy Reference',
    habitat: 'Reference ecosystem',
    tone: 'healthy',
    acousticComplexityIndex: 0.81,
    bioacousticIndex: 7.9,
    biologicalFrequencyOccupancy: 78,
    humanNoisePressure: 'Low',
    similarityToHealthy: 100,
  },
  {
    label: 'Restored Reef',
    habitat: 'Restoration site',
    tone: 'restored',
    acousticComplexityIndex: 0.69,
    bioacousticIndex: 6.8,
    biologicalFrequencyOccupancy: 66,
    humanNoisePressure: 'Moderate',
    similarityToHealthy: 81,
  },
  {
    label: 'Degraded Reef',
    habitat: 'Baseline site',
    tone: 'degraded',
    acousticComplexityIndex: 0.43,
    bioacousticIndex: 4.1,
    biologicalFrequencyOccupancy: 39,
    humanNoisePressure: 'Moderate',
    similarityToHealthy: 49,
  },
]

export const interpretationText =
  'The restored reef’s acoustic profile is currently closer to the healthy reference than to the degraded baseline. Improvement appears across multiple acoustic indicators rather than a single index. This pattern is consistent with recovering acoustic ecological activity, but it does not independently establish total biodiversity recovery or causation.'

export const interpretationRows = [
  { label: 'Healthy-reference similarity', value: '81%' },
  { label: 'Improvement over degraded baseline', value: '31%' },
  { label: 'Evidence consistency', value: '82%' },
]

export const interpretationLimitations =
  'Results should be interpreted alongside coral cover, fish surveys, water quality, and other ecological evidence.'

export const alerts: AlertItem[] = [
  {
    id: 'boat-noise',
    type: 'warning',
    message: 'Five recordings were excluded because of excessive boat noise.',
    timestamp: '6 hours ago',
  },
  {
    id: 'momentum',
    type: 'positive',
    message: 'Recovery momentum has remained positive for three monitoring periods.',
    timestamp: '1 day ago',
  },
  {
    id: 'next-review',
    type: 'info',
    message: 'The next recording review is scheduled in seven days.',
    timestamp: '2 days ago',
  },
  {
    id: 'device-upload',
    type: 'device',
    message: 'Healthy Reference Recorder uploaded new data three hours ago.',
    timestamp: '3 hours ago',
  },
]

export const sites: SiteStatus[] = [
  {
    id: 'restored',
    name: 'Restored Site',
    role: 'Restoration',
    markerShape: 'circle',
    recorderStatus: 'Online',
    statusDetail: 'Live · streaming',
  },
  {
    id: 'degraded',
    name: 'Degraded Comparison Site',
    role: 'Baseline',
    markerShape: 'square',
    recorderStatus: 'Online',
    statusDetail: 'Live · streaming',
  },
  {
    id: 'healthy',
    name: 'Healthy Reference Site',
    role: 'Reference',
    markerShape: 'triangle',
    recorderStatus: 'Delayed',
    statusDetail: 'Last upload 3 hours ago',
  },
]

export const recorderSummary = {
  activeRecorders: 3,
  offlineDevices: 0,
  lastSync: '3 hours ago',
}

export const trajectoryDisclaimer =
  'Illustrative momentum demonstration using prototype data. This timeline does not represent a validated longitudinal ecological study.'
