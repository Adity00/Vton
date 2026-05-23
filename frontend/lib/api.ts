import { Garment, BodyProfile, TryOnResponse } from './types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(error.detail || 'API request failed')
  }
  return res.json()
}

export async function getGarments(category?: string, fit_type?: string): Promise<Garment[]> {
  const params = new URLSearchParams()
  if (category) params.append('category', category)
  if (fit_type) params.append('fit_type', fit_type)
  const res = await fetch(`${API_URL}/garments?${params.toString()}`)
  return handleResponse<Garment[]>(res)
}

export async function getGarment(id: string): Promise<Garment> {
  const res = await fetch(`${API_URL}/garments/${id}`)
  return handleResponse<Garment>(res)
}

export async function analyzeBody(
  file: File,
  height?: number,
  weight?: number
): Promise<BodyProfile> {
  const formData = new FormData()
  formData.append('file', file)
  if (height) formData.append('height_cm', String(height))
  if (weight) formData.append('weight_kg', String(weight))
  const res = await fetch(`${API_URL}/analyze-body`, { method: 'POST', body: formData })
  return handleResponse<BodyProfile>(res)
}

export async function runTryOn(
  personImage: File,
  garmentId: string,
  sessionId: string,
  height?: number,
  weight?: number
): Promise<TryOnResponse> {
  const formData = new FormData()
  formData.append('person_image', personImage)
  formData.append('garment_id', garmentId)
  formData.append('session_id', sessionId)
  if (height) formData.append('height_cm', String(height))
  if (weight) formData.append('weight_kg', String(weight))
  const res = await fetch(`${API_URL}/tryon`, { method: 'POST', body: formData })
  return handleResponse<TryOnResponse>(res)
}

export async function getHistory(sessionId: string): Promise<TryOnResponse[]> {
  const res = await fetch(`${API_URL}/history/${sessionId}`)
  return handleResponse<TryOnResponse[]>(res)
}

export async function uploadGarment(formData: FormData): Promise<Garment> {
  const res = await fetch(`${API_URL}/garments`, { method: 'POST', body: formData })
  return handleResponse<Garment>(res)
}
