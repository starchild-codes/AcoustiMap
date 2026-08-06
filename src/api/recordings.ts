/** Recording API functions */

import { apiRequest, uploadFile } from './client'

export interface Recording {
  id: string
  project_id: string
  site_id: string | null
  filename: string
  file_size: number
  mime_type: string
  checksum: string
  habitat_category: 'restored' | 'degraded' | 'healthy'
  timestamp: string | null
  monitoring_period: string
  recorder_id: string
  notes: string
  uploaded_at: string
  has_audio_file: boolean
}

export interface RecordingUpdate {
  habitat_category?: 'restored' | 'degraded' | 'healthy'
  site_id?: string | null
  timestamp?: string
  monitoring_period?: string
  recorder_id?: string
  notes?: string
}

export async function listRecordings(projectId: string): Promise<Recording[]> {
  return apiRequest<Recording[]>(`/api/projects/${projectId}/recordings`)
}

export async function uploadRecording(
  projectId: string,
  file: File,
  metadata: {
    habitat_category: string
    site_id?: string
    timestamp?: string
    monitoring_period?: string
    recorder_id?: string
    notes?: string
  },
  signal?: AbortSignal,
): Promise<Recording> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('habitat_category', metadata.habitat_category)
  if (metadata.site_id) formData.append('site_id', metadata.site_id)
  if (metadata.timestamp) formData.append('timestamp', metadata.timestamp)
  if (metadata.monitoring_period) formData.append('monitoring_period', metadata.monitoring_period)
  if (metadata.recorder_id) formData.append('recorder_id', metadata.recorder_id)
  if (metadata.notes) formData.append('notes', metadata.notes)

  return uploadFile<Recording>(`/api/projects/${projectId}/recordings`, formData, signal)
}

export async function getRecording(id: string): Promise<Recording> {
  return apiRequest<Recording>(`/api/recordings/${id}`)
}

export async function updateRecording(id: string, data: RecordingUpdate): Promise<Recording> {
  return apiRequest<Recording>(`/api/recordings/${id}`, { method: 'PATCH', body: data })
}

export async function deleteRecording(id: string): Promise<void> {
  return apiRequest<void>(`/api/recordings/${id}`, { method: 'DELETE' })
}
