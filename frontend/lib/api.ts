import { Garment, BodyProfile, TryOnResponse } from './types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(error.detail || 'API request failed')
  }
  const data = await res.json()
  // Recursively map `id` to `_id` for Garment objects since backend uses `id`
  const mapIds = (obj: any): any => {
    if (Array.isArray(obj)) return obj.map(mapIds)
    if (obj !== null && typeof obj === 'object') {
      const newObj = { ...obj }
      if ('id' in newObj && !('_id' in newObj)) {
        newObj._id = newObj.id
      }
      for (const key in newObj) {
        newObj[key] = mapIds(newObj[key])
      }
      return newObj
    }
    return obj
  }
  return mapIds(data)
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
  garmentId: string,
  token: string,
  personImage?: File,
  savedPhotoUrl?: string,
  height?: number,
  weight?: number
): Promise<TryOnResponse> {
  const formData = new FormData()
  formData.append('garment_id', garmentId)
  if (personImage) formData.append('person_image', personImage)
  if (savedPhotoUrl) formData.append('saved_photo_url', savedPhotoUrl)
  if (height) formData.append('height_cm', String(height))
  if (weight) formData.append('weight_kg', String(weight))
  
  const res = await fetch(`${API_URL}/tryon`, { 
    method: 'POST', 
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData 
  })
  return handleResponse<TryOnResponse>(res)
}

export async function getHistory(token: string): Promise<TryOnResponse[]> {
  const res = await fetch(`${API_URL}/history`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  return handleResponse<TryOnResponse[]>(res)
}

export async function getTryOnResult(id: string, token: string): Promise<TryOnResponse> {
  const res = await fetch(`${API_URL}/history/${id}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  return handleResponse<TryOnResponse>(res)
}

export async function uploadGarment(formData: FormData): Promise<Garment> {
  const res = await fetch(`${API_URL}/garments`, { method: 'POST', body: formData })
  return handleResponse<Garment>(res)
}
