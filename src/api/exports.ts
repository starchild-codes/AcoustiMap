/** Export API functions */

import { downloadBlob } from './client'

export async function exportProjectJson(projectId: string): Promise<Blob> {
  return downloadBlob(`/api/projects/${projectId}/exports/json`)
}

export async function exportRecordingsCsv(projectId: string): Promise<Blob> {
  return downloadBlob(`/api/projects/${projectId}/exports/csv`)
}

export async function exportReproducibleBundle(projectId: string, includeAudio = false): Promise<Blob> {
  return downloadBlob(`/api/projects/${projectId}/exports/reproducible-bundle?include_audio=${includeAudio}`)
}
