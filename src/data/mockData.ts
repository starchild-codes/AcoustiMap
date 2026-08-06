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
}

export interface TrajectoryPoint {
  period: string
  restored: number
  degraded: number
  healthy: number
}

export interface AcousticEvidence {
  label: string
  tone: 'healthy' | 'restored' | 'degraded'
  acousticComplexityIndex: number
  bioacousticIndex: number
  biologicalFrequencyOccupancy: number
  humanNoisePressure: 'Low' | 'Moderate' | 'High'
}

export interface AlertItem {
  id: string
  type: 'info' | 'positive' | 'warning'
  message: string
}

export interface SiteStatus {
  id: string
  name: string
  role: string
  recorderStatus: 'Online' | 'Offline' | 'Delayed'
  statusDetail: string
}

export interface ProjectSummary {
  name: string
  location: string
  monitoringPeriods: string[]
  activePeriod: string
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
}

export const overviewInterpretation =
  'Acoustic activity at the restored reef is becoming more similar to the healthy reference reef. The current result indicates positive recovery, although continued monitoring is required.'

export const metrics: Metric[] = [
  {
    id: 'recovery-score',
    title: 'Acoustic Recovery Score',
    value: '74/100',
    change: '+8 points since previous period',
    status: 'Positive recovery',
    statusTone: 'positive',
    trend: 'up',
    tooltip:
      'A composite score (0–100) comparing the restored reef’s soundscape to the healthy reference. Higher values mean closer acoustic similarity.',
  },
  {
    id: 'momentum',
    title: 'Recovery Momentum',
    value: 'Improving',
    supportingValue: '+3.4 points per monitoring period',
    status: 'Positive trend',
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
    status: 'Moderate–High',
    statusTone: 'info',
    tooltip:
      'How consistently the underlying acoustic indicators agree with each other. Higher consistency means the score is less likely to be driven by a single noisy metric.',
  },
  {
    id: 'recordings',
    title: 'Recordings Analysed',
    value: '96',
    supportingValue: '91 valid, 5 excluded',
    status: '5 excluded',
    statusTone: 'neutral',
    tooltip:
      'Total audio recordings processed this period. Recordings are excluded when boat noise, equipment faults, or storm conditions make them unusable.',
  },
  {
    id: 'coverage',
    title: 'Monitoring Coverage',
    value: '84 days',
    supportingValue: '92% scheduled coverage',
    status: 'On schedule',
    statusTone: 'positive',
    tooltip:
      'The number of days with usable recordings out of the planned monitoring window. Gaps are usually caused by equipment downtime or severe weather.',
  },
]

export const trajectory: TrajectoryPoint[] = [
  { period: 'Period 1', restored: 41, degraded: 38, healthy: 88 },
  { period: 'Period 2', restored: 46, degraded: 39, healthy: 89 },
  { period: 'Period 3', restored: 53, degraded: 40, healthy: 90 },
  { period: 'Period 4', restored: 61, degraded: 41, healthy: 90 },
  { period: 'Period 5', restored: 68, degraded: 42, healthy: 91 },
  { period: 'Period 6', restored: 74, degraded: 42, healthy: 92 },
]

export const interventionPeriodIndex = 1 // structures installed between Period 1 and Period 2

export const acousticEvidence: AcousticEvidence[] = [
  {
    label: 'Healthy Reference',
    tone: 'healthy',
    acousticComplexityIndex: 0.81,
    bioacousticIndex: 7.9,
    biologicalFrequencyOccupancy: 78,
    humanNoisePressure: 'Low',
  },
  {
    label: 'Restored Reef',
    tone: 'restored',
    acousticComplexityIndex: 0.69,
    bioacousticIndex: 6.8,
    biologicalFrequencyOccupancy: 66,
    humanNoisePressure: 'Moderate',
  },
  {
    label: 'Degraded Reef',
    tone: 'degraded',
    acousticComplexityIndex: 0.43,
    bioacousticIndex: 4.1,
    biologicalFrequencyOccupancy: 39,
    humanNoisePressure: 'Moderate',
  },
]

export const interpretationText =
  'The restored reef’s acoustic profile is currently closer to the healthy reference than to the degraded baseline. Multiple acoustic indicators show consistent improvement. This suggests that acoustically active ecological communities may be recovering, but the result should be interpreted alongside field surveys and other ecological evidence.'

export const interpretationRows = [
  { label: 'Healthy-reference similarity', value: '81%' },
  { label: 'Improvement over degraded baseline', value: '31%' },
  { label: 'Evidence consistency', value: '82%' },
]

export const alerts: AlertItem[] = [
  {
    id: 'boat-noise',
    type: 'warning',
    message: 'Five recordings were excluded because of excessive boat noise.',
  },
  {
    id: 'momentum',
    type: 'positive',
    message: 'Recovery momentum has remained positive for three monitoring periods.',
  },
  {
    id: 'next-review',
    type: 'info',
    message: 'The next recording review is scheduled in seven days.',
  },
]

export const sites: SiteStatus[] = [
  {
    id: 'restored',
    name: 'Restored Site',
    role: 'Restoration',
    recorderStatus: 'Online',
    statusDetail: 'Live · streaming',
  },
  {
    id: 'degraded',
    name: 'Degraded Comparison Site',
    role: 'Baseline',
    recorderStatus: 'Online',
    statusDetail: 'Live · streaming',
  },
  {
    id: 'healthy',
    name: 'Healthy Reference Site',
    role: 'Reference',
    recorderStatus: 'Delayed',
    statusDetail: 'Last upload 3 hours ago',
  },
]

export const trajectoryDisclaimer =
  'Illustrative momentum demonstration using prototype data. This timeline does not represent a validated longitudinal ecological study.'
