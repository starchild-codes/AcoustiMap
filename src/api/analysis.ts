/** Analysis job and results API functions */

import { apiRequest, API_BASE_URL } from './client'

export interface AnalysisJob {
  id: string
  project_id: string
  config_id: string
  recording_ids: string[]
  state: string
  total_recordings: number
  processed_recordings: number
  failed_recordings: number
  current_recording_id: string | null
  current_stage: string
  progress_percent: number
  error_summary: string
  started_at: string | null
  completed_at: string | null
  created_at: string
}

export interface QualityFlag {
  id: string
  flag_code: string
  severity: 'info' | 'review' | 'exclude_recommended' | 'fatal'
  measured_value: string
  threshold: string
  explanation: string
  recommended_action: string
  created_at: string
}

export interface ManualReview {
  id: string
  previous_status: string
  new_status: string
  reason: string
  reviewer_notes: string
  created_at: string
}

export interface RecordingAnalysis {
  id: string
  recording_id: string
  job_id: string
  config_id: string
  analysis_version: string
  processed_at: string
  input_checksum: string
  runtime_seconds: number
  software_version: string
  is_active: boolean
  technical_features: Record<string, number | null>
  ecoacoustic_features: Record<string, number | null>
  comparison: Record<string, number | null>
  quality_info: Record<string, unknown>
  artifacts: Record<string, unknown>
  errors_warnings: string[]
  quality_flags: QualityFlag[]
  manual_reviews: ManualReview[]
}

export interface ProjectSummary {
  id: string
  project_id: string
  config_id: string
  recovery_score: number | null
  median_distance_to_healthy: number | null
  median_distance_to_degraded: number | null
  improvement_over_degraded: number | null
  evidence_consistency: number | null
  confidence_label: string
  confidence_reasons: string[]
  bootstrap_median: number | null
  bootstrap_mean: number | null
  bootstrap_std: number | null
  bootstrap_ci_low: number | null
  bootstrap_ci_high: number | null
  bootstrap_iterations: number
  bootstrap_requested_iterations: number
  included_recording_ids: string[]
  excluded_recording_ids: string[]
  feature_names: string[]
  scaling_method: string
  warnings: string[]
  reference_profiles: Record<string, unknown>
  temporal_result: Record<string, unknown>
  calculated_at: string
}

export async function createAnalysisJob(
  projectId: string,
  configId: string,
  recordingIds?: string[],
): Promise<AnalysisJob> {
  return apiRequest<AnalysisJob>(`/api/projects/${projectId}/analysis-jobs`, {
    method: 'POST',
    body: { config_id: configId, recording_ids: recordingIds },
  })
}

export async function getAnalysisJob(jobId: string): Promise<AnalysisJob> {
  return apiRequest<AnalysisJob>(`/api/analysis-jobs/${jobId}`)
}

export async function listAnalysisJobs(projectId: string): Promise<AnalysisJob[]> {
  return apiRequest<AnalysisJob[]>(`/api/projects/${projectId}/analysis-jobs`)
}

export async function listJobResults(jobId: string): Promise<RecordingAnalysis[]> {
  return apiRequest<RecordingAnalysis[]>(`/api/analysis-jobs/${jobId}/results`)
}

export function artifactUrl(analysisId: string, artifactName: string): string {
  return `${API_BASE_URL}/api/analyses/${analysisId}/artifacts/${encodeURIComponent(artifactName)}`
}

export async function cancelJob(jobId: string): Promise<AnalysisJob> {
  return apiRequest<AnalysisJob>(`/api/analysis-jobs/${jobId}/cancel`, { method: 'POST' })
}

export async function retryJob(jobId: string): Promise<AnalysisJob> {
  return apiRequest<AnalysisJob>(`/api/analysis-jobs/${jobId}/retry`, { method: 'POST' })
}

export async function listRecordingAnalyses(recordingId: string): Promise<RecordingAnalysis[]> {
  return apiRequest<RecordingAnalysis[]>(`/api/recordings/${recordingId}/analyses`)
}

export async function getProjectSummary(projectId: string): Promise<ProjectSummary | null> {
  return apiRequest<ProjectSummary | null>(`/api/projects/${projectId}/summary`)
}

export async function createManualReview(
  analysisId: string,
  data: { new_status: string; reason?: string; reviewer_notes?: string },
): Promise<ManualReview> {
  return apiRequest<ManualReview>(`/api/analyses/${analysisId}/manual-review`, {
    method: 'POST',
    body: data,
  })
}
