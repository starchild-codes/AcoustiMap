/**
 * Central API client with typed request/response handling.
 * All API calls go through this module — no direct fetch in page components.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001'

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
    public field?: string,
  ) {
    super(detail)
    this.name = 'ApiError'
  }
}

interface RequestOptions {
  method?: string
  body?: unknown
  signal?: AbortSignal
  headers?: Record<string, string>
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal, headers = {} } = options

  const init: RequestInit = {
    method,
    signal,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  }

  if (body !== undefined && !(body instanceof FormData)) {
    init.body = JSON.stringify(body)
  }

  if (body instanceof FormData) {
    init.body = body
    delete (init.headers as Record<string, string>)['Content-Type']
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, init)

    if (response.status === 204) {
      return undefined as T
    }

    const contentType = response.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      const data = await response.json()
      if (!response.ok) {
        throw new ApiError(response.status, data.detail || 'Request failed', data.field)
      }
      return data as T
    }

    if (contentType.includes('text/csv') || contentType.includes('application/zip') || contentType.includes('application/json')) {
      const blob = await response.blob()
      if (!response.ok) {
        throw new ApiError(response.status, 'Download failed')
      }
      return blob as unknown as T
    }

    if (!response.ok) {
      throw new ApiError(response.status, `Request failed with status ${response.status}`)
    }

    return undefined as T
  } catch (err) {
    if (err instanceof ApiError) throw err
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    console.error('API request error:', err)
    throw new ApiError(0, 'Network error: could not reach the analysis server. Is the backend running?')
  }
}

export async function uploadFile<T>(
  path: string,
  formData: FormData,
  signal?: AbortSignal,
): Promise<T> {
  return request<T>(path, { method: 'POST', body: formData, signal })
}

export async function downloadBlob(path: string, signal?: AbortSignal): Promise<Blob> {
  return request<Blob>(path, { signal })
}

export { request as apiRequest, API_BASE_URL }
