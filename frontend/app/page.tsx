'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Navbar from '@/components/Navbar'
import PhotoUpload from '@/components/PhotoUpload'
import GarmentCard from '@/components/GarmentCard'
import LoadingState from '@/components/LoadingState'
import { ToastProvider, useToast } from '@/components/Toast'
import { getGarments, runTryOn } from '@/lib/api'
import { Garment } from '@/lib/types'

const CATEGORIES = ['All', 'tshirt', 'hoodie', 'jacket', 'shirt']
const CATEGORY_LABELS: Record<string, string> = {
  All: 'All',
  tshirt: 'T-Shirts',
  hoodie: 'Hoodies',
  jacket: 'Jackets',
  shirt: 'Shirts',
}

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem('vton_session_id')
  if (!id) {
    id = 'sess_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
    localStorage.setItem('vton_session_id', id)
  }
  return id
}

function HomeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { addToast } = useToast()

  const [garments, setGarments] = useState<Garment[]>([])
  const [loadingGarments, setLoadingGarments] = useState(true)
  const [activeCategory, setActiveCategory] = useState('All')
  const [selectedGarment, setSelectedGarment] = useState<Garment | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [showMetrics, setShowMetrics] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const previewUrlRef = useRef<string | null>(null)

  // Load garments
  useEffect(() => {
    setLoadingGarments(true)
    const cat = activeCategory === 'All' ? undefined : activeCategory
    getGarments(cat)
      .then(setGarments)
      .catch(() => addToast('Failed to load garments', 'error'))
      .finally(() => setLoadingGarments(false))
  }, [activeCategory]) // eslint-disable-line react-hooks/exhaustive-deps

  // Pre-select garment from URL query param
  useEffect(() => {
    const garmentId = searchParams.get('garment')
    if (garmentId && garments.length > 0) {
      const g = garments.find(g => g._id === garmentId)
      if (g) setSelectedGarment(g)
    }
  }, [searchParams, garments])

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file)
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    const url = URL.createObjectURL(file)
    previewUrlRef.current = url
    setPreviewUrl(url)
  }, [])

  const handleClear = useCallback(() => {
    setSelectedFile(null)
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }
    setPreviewUrl(null)
  }, [])

  const handleTryOn = async () => {
    if (!selectedFile || !selectedGarment) return
    const sessionId = getOrCreateSessionId()
    setIsLoading(true)
    try {
      await runTryOn(
        selectedFile,
        selectedGarment._id,
        sessionId,
        height ? parseFloat(height) : undefined,
        weight ? parseFloat(weight) : undefined
      )
      router.push(`/try-on?session=${sessionId}`)
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Try-on failed. Please try again.', 'error')
      setIsLoading(false)
    }
  }

  const canTryOn = !!selectedFile && !!selectedGarment && !isLoading

  return (
    <>
      <LoadingState isVisible={isLoading} onCancel={() => setIsLoading(false)} />
      <Navbar />

      <main>
        {/* ---- HERO ---- */}
        <section
          style={{
            padding: '5rem 0 4rem',
            borderBottom: '1px solid var(--gray-200)',
          }}
        >
          <div className="container">
            <div style={{ maxWidth: '680px' }}>
              <p
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--gray-400)',
                  marginBottom: '1.5rem',
                }}
              >
                AI-Powered Virtual Try-On
              </p>
              <h1 className="hero-headline" style={{ marginBottom: '1.25rem' }}>
                Try it on<br />before you buy.
              </h1>
              <p className="hero-sub" style={{ marginBottom: '2.5rem', maxWidth: '480px' }}>
                Upload your photo. Our AI analyzes your body proportions and shows you any garment on you — instantly.
              </p>
              <a
                href="#upload"
                className="btn btn-primary btn-lg"
                style={{ display: 'inline-flex' }}
              >
                Upload Your Photo
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="4" y1="8" x2="12" y2="8" />
                  <polyline points="9,5 12,8 9,11" />
                </svg>
              </a>
            </div>
          </div>
        </section>

        {/* ---- UPLOAD + GARMENT SELECT ---- */}
        <section id="upload" style={{ padding: '4rem 0' }}>
          <div className="container">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr',
                gap: '3rem',
              }}
              className="main-grid"
            >
              {/* LEFT: Upload */}
              <div>
                <div style={{ marginBottom: '2rem' }}>
                  <p className="section-title">Step 1 — Your Photo</p>
                  <PhotoUpload
                    onFileSelect={handleFileSelect}
                    previewUrl={previewUrl}
                    onClear={handleClear}
                  />

                  {/* Optional metrics */}
                  <div style={{ marginTop: '1rem' }}>
                    <button
                      onClick={() => setShowMetrics(!showMetrics)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.8125rem',
                        color: 'var(--gray-500)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        fontFamily: 'inherit',
                        padding: 0,
                      }}
                    >
                      <svg
                        width="14"
                        height="14"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        style={{
                          transform: showMetrics ? 'rotate(180deg)' : 'rotate(0)',
                          transition: 'transform 200ms',
                        }}
                      >
                        <polyline points="3,5 7,9 11,5" />
                      </svg>
                      {showMetrics ? 'Hide' : 'Add'} height &amp; weight for better accuracy
                    </button>

                    {showMetrics && (
                      <div
                        style={{
                          marginTop: '0.75rem',
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '0.75rem',
                        }}
                      >
                        <div>
                          <label className="label" htmlFor="height-input">Height (cm)</label>
                          <input
                            id="height-input"
                            type="number"
                            className="input"
                            placeholder="175"
                            value={height}
                            onChange={e => setHeight(e.target.value)}
                            min={100}
                            max={250}
                          />
                        </div>
                        <div>
                          <label className="label" htmlFor="weight-input">Weight (kg)</label>
                          <input
                            id="weight-input"
                            type="number"
                            className="input"
                            placeholder="70"
                            value={weight}
                            onChange={e => setWeight(e.target.value)}
                            min={30}
                            max={250}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Try-On button */}
                {selectedFile && (
                  <div className="animate-fade-up">
                    {selectedGarment ? (
                      <button
                        id="generate-tryon-btn"
                        onClick={handleTryOn}
                        disabled={!canTryOn}
                        className="btn btn-primary btn-lg"
                        style={{ width: '100%' }}
                      >
                        Generate Try-On
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M4 4l8 4-8 4V4z" fill="currentColor" />
                        </svg>
                      </button>
                    ) : (
                      <p style={{ fontSize: '0.875rem', color: 'var(--gray-400)', textAlign: 'center' }}>
                        Select a garment below to continue
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* RIGHT: Garment Selection */}
              <div>
                <p className="section-title" style={{ marginBottom: '0' }}>Step 2 — Choose a Garment</p>

                {/* Filter tabs */}
                <div className="filter-tabs" style={{ marginBottom: '1px' }}>
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      id={`filter-tab-${cat.toLowerCase()}`}
                      className={`filter-tab${activeCategory === cat ? ' active' : ''}`}
                      onClick={() => setActiveCategory(cat)}
                    >
                      {CATEGORY_LABELS[cat]}
                    </button>
                  ))}
                </div>

                {loadingGarments ? (
                  <div className="garment-grid">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="garment-card">
                        <div className="skeleton" style={{ aspectRatio: '3/4' }} />
                        <div style={{ padding: '0.75rem' }}>
                          <div className="skeleton" style={{ height: '14px', marginBottom: '8px', borderRadius: '4px' }} />
                          <div className="skeleton" style={{ height: '12px', width: '60%', borderRadius: '4px' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : garments.length === 0 ? (
                  <div
                    style={{
                      padding: '3rem',
                      textAlign: 'center',
                      color: 'var(--gray-400)',
                      fontSize: '0.875rem',
                      border: '1px solid var(--gray-200)',
                    }}
                  >
                    No garments found in this category.
                  </div>
                ) : (
                  <div className="garment-grid">
                    {garments.map(g => (
                      <GarmentCard
                        key={g._id}
                        garment={g}
                        isSelected={selectedGarment?._id === g._id}
                        onClick={() => setSelectedGarment(prev => prev?._id === g._id ? null : g)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer
        style={{
          borderTop: '1px solid var(--gray-200)',
          padding: '2rem 0',
          textAlign: 'center',
        }}
      >
        <div className="container">
          <p style={{ fontSize: '0.8125rem', color: 'var(--gray-400)' }}>
            VTON &mdash; Virtual Try-On System
          </p>
        </div>
      </footer>

      <style>{`
        @media (min-width: 900px) {
          .main-grid {
            grid-template-columns: 380px 1fr !important;
          }
        }
      `}</style>
    </>
  )
}

export default function HomePage() {
  return (
    <ToastProvider>
      <Suspense fallback={<div style={{ minHeight: '100vh' }} />}>
        <HomeContent />
      </Suspense>
    </ToastProvider>
  )
}
