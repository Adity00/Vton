'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import TryOnResult from '@/components/TryOnResult'
import SizeRecommendation from '@/components/SizeRecommendation'
import SimilarItems from '@/components/SimilarItems'
import { getHistory } from '@/lib/api'
import { TryOnResponse } from '@/lib/types'

export default function TryOnPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = searchParams.get('session') || ''

  const [result, setResult] = useState<TryOnResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID provided.')
      setLoading(false)
      return
    }
    getHistory(sessionId)
      .then(history => {
        if (history.length === 0) {
          setError('No try-on results found for this session.')
        } else {
          setResult(history[0]) // newest first
        }
      })
      .catch(err => setError(err.message || 'Failed to load results'))
      .finally(() => setLoading(false))
  }, [sessionId])

  const handleDownload = async () => {
    if (!result?.result_image_url) return
    try {
      const res = await fetch(result.result_image_url)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `vton-result-${sessionId}.jpg`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      // fallback: open in new tab
      window.open(result.result_image_url, '_blank')
    }
  }

  const handleShare = () => {
    const url = `${window.location.origin}/try-on?session=${sessionId}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div
          style={{
            minHeight: '60vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div
            className="skeleton"
            style={{ width: '60px', height: '60px', borderRadius: '50%' }}
          />
          <p style={{ color: 'var(--gray-400)', fontSize: '0.875rem' }}>Loading your result...</p>
        </div>
      </>
    )
  }

  if (error || !result) {
    return (
      <>
        <Navbar />
        <div
          style={{
            minHeight: '60vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '1.5rem',
            textAlign: 'center',
            padding: '2rem',
          }}
        >
          <div style={{ fontSize: '2rem' }}>⚠</div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Result Not Found</h2>
          <p style={{ color: 'var(--gray-500)', maxWidth: '360px', fontSize: '0.9rem' }}>
            {error || 'We could not find your try-on result. Please try again.'}
          </p>
          <button
            onClick={() => router.push('/')}
            className="btn btn-primary"
          >
            Try Again
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <main>
        <div className="container" style={{ padding: '2.5rem 1.5rem' }}>
          {/* Header */}
          <div style={{ marginBottom: '2rem' }}>
            <p className="section-title">Try-On Result</p>
            <h1
              style={{
                fontSize: 'clamp(1.5rem, 3vw, 2.25rem)',
                fontWeight: 800,
                letterSpacing: '-0.03em',
              }}
            >
              {result.garment.name}
            </h1>
          </div>

          {/* Main 2-col layout */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: '3rem',
              alignItems: 'start',
            }}
            className="result-grid"
          >
            {/* LEFT: Image comparison */}
            <div>
              <TryOnResult
                beforeUrl={result.original_image_url}
                afterUrl={result.result_image_url}
                processingMode={result.processing_mode}
              />

              {/* Action buttons */}
              <div
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  marginTop: '1rem',
                  flexWrap: 'wrap',
                }}
              >
                <button onClick={handleDownload} className="btn btn-secondary btn-sm" id="download-btn">
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="4,6 7,9 10,6" />
                    <line x1="7" y1="2" x2="7" y2="9" />
                    <path d="M2,10 Q2,12 4,12 H10 Q12,12 12,10" />
                  </svg>
                  Download
                </button>
                <button onClick={handleShare} className="btn btn-ghost btn-sm" id="share-btn">
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="3" r="2" />
                    <circle cx="3" cy="7" r="2" />
                    <circle cx="11" cy="11" r="2" />
                    <line x1="5" y1="6" x2="9" y2="4" />
                    <line x1="5" y1="8" x2="9" y2="10" />
                  </svg>
                  {copied ? 'Copied!' : 'Share'}
                </button>
              </div>
            </div>

            {/* RIGHT: Fit intelligence */}
            <div
              style={{
                border: '1px solid var(--gray-200)',
                padding: '2rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '2rem',
              }}
            >
              <SizeRecommendation fitResult={result.fit_result} />

              <div style={{ borderTop: '1px solid var(--gray-200)', paddingTop: '2rem' }}>
                <SimilarItems garments={result.similar_items} />
              </div>

              {/* Nav buttons */}
              <div
                style={{ borderTop: '1px solid var(--gray-200)', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
              >
                <button
                  onClick={() => router.push('/')}
                  className="btn btn-primary"
                  id="try-another-btn"
                >
                  Try Another Garment
                </button>
                <button
                  onClick={() => router.push('/history')}
                  className="btn btn-ghost btn-sm"
                  style={{ textAlign: 'center' }}
                  id="view-history-btn"
                >
                  View History
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        @media (min-width: 900px) {
          .result-grid {
            grid-template-columns: 1fr 400px !important;
          }
        }
      `}</style>
    </>
  )
}
