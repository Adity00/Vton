'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { getHistory } from '@/lib/api'
import { TryOnResponse } from '@/lib/types'

function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('vton_session_id') || ''
}

export default function HistoryPage() {
  const router = useRouter()
  const [history, setHistory] = useState<TryOnResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [sessionId, setSessionId] = useState('')

  useEffect(() => {
    const id = getSessionId()
    setSessionId(id)
    if (!id) {
      setLoading(false)
      return
    }
    getHistory(id)
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <Navbar />
      <main>
        <div style={{ borderBottom: '1px solid var(--gray-200)', padding: '2.5rem 0 1.5rem' }}>
          <div className="container">
            <p className="section-title">Your Session</p>
            <h1
              style={{
                fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
                fontWeight: 800,
                letterSpacing: '-0.04em',
              }}
            >
              Try-On History
            </h1>
            {sessionId && (
              <p style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: '0.5rem', fontFamily: 'monospace' }}>
                Session: {sessionId}
              </p>
            )}
          </div>
        </div>

        <div className="container" style={{ padding: '2.5rem 1.5rem' }}>
          {loading ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: '1.5rem',
              }}
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i}>
                  <div className="skeleton" style={{ aspectRatio: '3/4', marginBottom: '0.75rem' }} />
                  <div className="skeleton" style={{ height: '14px', borderRadius: '4px', marginBottom: '0.5rem' }} />
                  <div className="skeleton" style={{ height: '12px', width: '60%', borderRadius: '4px' }} />
                </div>
              ))}
            </div>
          ) : !sessionId ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--gray-400)' }}>
              <p style={{ fontSize: '1rem', marginBottom: '1.5rem' }}>No session found.</p>
              <button onClick={() => router.push('/')} className="btn btn-primary">Start a Try-On</button>
            </div>
          ) : history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--gray-400)' }}>
              <p style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>No try-ons yet.</p>
              <p style={{ fontSize: '0.875rem', marginBottom: '1.5rem' }}>Upload a photo and try on a garment to see your history here.</p>
              <button onClick={() => router.push('/')} className="btn btn-primary">Try Something On</button>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: '1px',
                background: 'var(--gray-200)',
              }}
            >
              {history.map((item, i) => (
                <button
                  key={item.session_id + i}
                  onClick={() => router.push(`/try-on?session=${item.session_id}`)}
                  style={{
                    background: 'var(--white)',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    padding: 0,
                    transition: 'transform 150ms',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.01)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                  aria-label={`View try-on result for ${item.garment?.name || 'Garment'}`}
                >
                  <div style={{ position: 'relative', aspectRatio: '3/4', background: 'var(--gray-100)' }}>
                    {item.result_image_url && (
                      <Image
                        src={item.result_image_url}
                        alt={`Try-on result: ${item.garment?.name || 'Garment'}`}
                        fill
                        sizes="(max-width: 640px) 50vw, 33vw"
                        style={{ objectFit: 'cover' }}
                      />
                    )}
                    {/* Mode badge */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '0.625rem',
                        right: '0.625rem',
                        padding: '0.2rem 0.5rem',
                        background: 'rgba(0,0,0,0.7)',
                        color: 'white',
                        fontSize: '0.625rem',
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        borderRadius: '2px',
                      }}
                    >
                      {item.processing_mode === 'ai' ? 'AI' : 'Basic'}
                    </div>
                  </div>
                  <div style={{ padding: '0.875rem' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.garment?.name || 'Garment'}
                    </div>
                    <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                      <span className="pill pill-gray">{item.fit_result?.recommended_size || 'N/A'}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>{item.fit_result?.fit_label || 'Unknown fit'}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
