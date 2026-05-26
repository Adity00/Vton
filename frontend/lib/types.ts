export type Garment = {
  _id: string
  name: string
  category: string
  fit_type: string
  render_mode: string
  image_url: string
  garment_image_url: string
  torso_ratio: number
  shoulder_ratio: number
  sleeve_ratio: number
  drape_factor: number
}

export type BodyProfile = {
  shoulder_width_ratio: number
  torso_length_ratio: number
  sleeve_length_ratio: number
  neck_width_ratio: number
  estimated_size: string
  height_cm?: number
  weight_kg?: number
}

export type FitResult = {
  recommended_size: string
  fit_label: string
  fit_score: number
  fit_notes: string[]
}

export type TryOnResponse = {
  id?: string
  session_id?: string
  result_image_url: string
  original_image_url: string
  garment: Garment
  body_profile: BodyProfile
  fit_result: FitResult
  similar_items: Garment[]
  processing_mode: 'ai' | 'fallback'
}
