/** Project API functions */

import { apiRequest } from './client'

export interface Project {
  id: string
  name: string
  description: string
  ecosystem_type: string
  country: string
  region: string
  latitude: number | null
  longitude: number | null
  restoration_intervention: string
  intervention_date: string | null
  monitoring_start: string | null
  monitoring_end: string | null
  status: string
  privacy: string
  organisation: string
  primary_contact: string
  scientific_notes: string
  is_demo: boolean
  created_at: string
  updated_at: string
}

export interface ProjectCreate {
  name: string
  description?: string
  ecosystem_type?: string
  country?: string
  region?: string
  latitude?: number
  longitude?: number
  restoration_intervention?: string
  intervention_date?: string
  monitoring_start?: string
  monitoring_end?: string
  status?: string
  privacy?: string
  organisation?: string
  primary_contact?: string
  scientific_notes?: string
}

export interface ProjectUpdate extends Partial<ProjectCreate> {}

export async function listProjects(search?: string, status?: string): Promise<Project[]> {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (status) params.set('status', status)
  const query = params.toString() ? `?${params}` : ''
  return apiRequest<Project[]>(`/api/projects${query}`)
}

export async function getProject(id: string): Promise<Project> {
  return apiRequest<Project>(`/api/projects/${id}`)
}

export async function createProject(data: ProjectCreate): Promise<Project> {
  return apiRequest<Project>('/api/projects', { method: 'POST', body: data })
}

export async function updateProject(id: string, data: ProjectUpdate): Promise<Project> {
  return apiRequest<Project>(`/api/projects/${id}`, { method: 'PATCH', body: data })
}

export async function deleteProject(id: string): Promise<void> {
  return apiRequest<void>(`/api/projects/${id}`, { method: 'DELETE' })
}
