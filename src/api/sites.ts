/** Site API functions */

import { apiRequest } from './client'

export interface Site {
  id: string
  project_id: string
  name: string
  site_type: 'restored' | 'degraded' | 'healthy'
  latitude: number | null
  longitude: number | null
  habitat_description: string
  recorder_id: string
  recorder_model: string
  deployment_date: string | null
  mic_height_depth: number | null
  distance_to_noise: number | null
  notes: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SiteCreate {
  name: string
  site_type: 'restored' | 'degraded' | 'healthy'
  latitude?: number
  longitude?: number
  habitat_description?: string
  recorder_id?: string
  recorder_model?: string
  deployment_date?: string
  mic_height_depth?: number
  distance_to_noise?: number
  notes?: string
  is_active?: boolean
}

export interface SiteUpdate extends Partial<SiteCreate> {}

export async function listSites(projectId: string): Promise<Site[]> {
  return apiRequest<Site[]>(`/api/projects/${projectId}/sites`)
}

export async function createSite(projectId: string, data: SiteCreate): Promise<Site> {
  return apiRequest<Site>(`/api/projects/${projectId}/sites`, { method: 'POST', body: data })
}

export async function updateSite(siteId: string, data: SiteUpdate): Promise<Site> {
  return apiRequest<Site>(`/api/sites/${siteId}`, { method: 'PATCH', body: data })
}

export async function deleteSite(siteId: string): Promise<void> {
  return apiRequest<void>(`/api/sites/${siteId}`, { method: 'DELETE' })
}
