/** Analysis configuration API functions */

import { apiRequest } from './client'

export interface AnalysisConfig {
  id: string
  project_id: string
  name: string
  is_default: boolean
  is_demo: boolean
  target_sample_rate: number
  target_channel_mode: string
  clip_duration: number
  start_offset: number
  freq_min: number
  freq_max: number
  fft_size: number
  window_size: number
  hop_length: number
  aci_freq_step: number
  aci_time_step: number
  bi_freq_min: number
  bi_freq_max: number
  silence_threshold: number
  clipping_threshold: number
  low_freq_noise_threshold: number
  normalisation_method: string
  similarity_scaling_method: string
  random_seed: number
  software_version: string
  created_at: string
  updated_at: string
}

export interface ConfigValidationWarning {
  code: string
  message: string
}

export interface AnalysisConfigWithWarnings extends AnalysisConfig {
  warnings: ConfigValidationWarning[]
}

export interface AnalysisConfigCreate {
  name: string
  is_default?: boolean
  target_sample_rate?: number
  target_channel_mode?: string
  clip_duration?: number
  start_offset?: number
  freq_min?: number
  freq_max?: number
  fft_size?: number
  window_size?: number
  hop_length?: number
  aci_freq_step?: number
  aci_time_step?: number
  bi_freq_min?: number
  bi_freq_max?: number
  silence_threshold?: number
  clipping_threshold?: number
  low_freq_noise_threshold?: number
  normalisation_method?: string
  similarity_scaling_method?: string
  random_seed?: number
}

export async function listConfigurations(projectId: string): Promise<AnalysisConfig[]> {
  return apiRequest<AnalysisConfig[]>(`/api/projects/${projectId}/configurations`)
}

export async function createConfiguration(
  projectId: string,
  data: AnalysisConfigCreate,
): Promise<AnalysisConfigWithWarnings> {
  return apiRequest<AnalysisConfigWithWarnings>(`/api/projects/${projectId}/configurations`, {
    method: 'POST',
    body: data,
  })
}

export async function updateConfiguration(
  configId: string,
  data: Partial<AnalysisConfigCreate>,
): Promise<AnalysisConfigWithWarnings> {
  return apiRequest<AnalysisConfigWithWarnings>(`/api/configurations/${configId}`, {
    method: 'PATCH',
    body: data,
  })
}
