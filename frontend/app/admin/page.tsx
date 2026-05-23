'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import Navbar from '@/components/Navbar'
import { ToastProvider, useToast } from '@/components/Toast'
import { getGarments, uploadGarment } from '@/lib/api'
import { Garment } from '@/lib/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const FIELD_TIPS: Record<string, string> = {
  torso_ratio: 'Torso ratio: 1.3 = oversized/long torso, 0.9 = cropped',
  shoulder_ratio: 'Shoulder ratio: 1.15 = wide/dropped shoulders, 0.95 = fitted',
  sleeve_ratio: 'Sleeve ratio: 0.85 = standard length, 0.7 = short sleeve',
  drape_factor: 'Drape factor: 0.8 = very loose/flowy, 0.2 = structured/fitted',
}

function AdminContent() {
  const { addToast } = useToast()
  const [garments, setGarments] = useState<Garment[]>([])
  const [loadingGarments, setLoadingGarments] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '',
    category: 'tshirt',
    fit_type: 'regular',
    render_mode: 'overlay',
    torso_ratio: '1.0',
    shoulder_ratio: '1.0',
    sleeve_ratio: '0.85',
    drape_factor: '0.5',
  })
  const displayImageRef = useRef<HTMLInputElement>(null)
  const garmentImageRef = useRef<HTMLInputElement>(null)

  const loadGarments = () => {
    setLoadingGarments(true)
    getGarments()
      .then(setGarments)
      .catch(() => addToast('Failed to load garments', 'error'))
      .finally(() => setLoadingGarments(false))
  }

  useEffect(loadGarments, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleField = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!displayImageRef.current?.files?.[0] || !garmentImageRef.current?.files?.[0]) {
      addToast('Please select both display and garment images', 'error')
      return
    }
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => fd.append(k, v))
    fd.append('display_image', displayImageRef.current.files[0])
    fd.append('garment_image', garmentImageRef.current.files[0])

    setSubmitting(true)
    try {
      await uploadGarment(fd)
      addToast(`"${form.name}" uploaded successfully!`, 'success')
      setForm({ name: '', category: 'tshirt', fit_type: 'regular', render_mode: 'overlay', torso_ratio: '1.0', shoulder_ratio: '1.0', sleeve_ratio: '0.85', drape_factor: '0.5' })
      if (displayImageRef.current) displayImageRef.current.value = ''
      if (garmentImageRef.current) garmentImageRef.current.value = ''
      loadGarments()
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Upload failed', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (g: Garment) => {
    if (!window.confirm(`Delete "${g.name}"? This cannot be undone.`)) return
    setDeletingId(g._id)
    try {
      const res = await fetch(`${API_URL}/garments/${g._id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      addToast(`"${g.name}" deleted`, 'success')
      loadGarments()
    } catch {
      addToast('Failed to delete garment', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      <Navbar />
      <main>
        <div
          style={{
            borderBottom: '1px solid var(--gray-200)',
            padding: '2.5rem 0 1.5rem',
          }}
        >
          <div className="container">
            <p className="section-title">Admin Panel</p>
            <h1
              style={{
                fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
                fontWeight: 800,
                letterSpacing: '-0.04em',
              }}
            >
              Garment Management
            </h1>
          </div>
        </div>

        <div className="container" style={{ padding: '2.5rem 1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '3rem' }} className="admin-grid">

            {/* --- UPLOAD FORM --- */}
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.5rem', letterSpacing: '-0.01em' }}>
                Upload New Garment
              </h2>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} id="admin-upload-form">

                <div>
                  <label className="label" htmlFor="admin-name">Garment Name</label>
                  <input id="admin-name" className="input" required placeholder="e.g. Classic White Tee" value={form.name} onChange={e => handleField('name', e.target.value)} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="label" htmlFor="admin-category">Category</label>
                    <select id="admin-category" className="input" value={form.category} onChange={e => handleField('category', e.target.value)}>
                      <option value="tshirt">T-Shirt</option>
                      <option value="hoodie">Hoodie</option>
                      <option value="jacket">Jacket</option>
                      <option value="shirt">Shirt</option>
                    </select>
                  </div>
                  <div>
                    <label className="label" htmlFor="admin-fit-type">Fit Type</label>
                    <select id="admin-fit-type" className="input" value={form.fit_type} onChange={e => handleField('fit_type', e.target.value)}>
                      <option value="tight">Tight</option>
                      <option value="regular">Regular</option>
                      <option value="oversized">Oversized</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label" htmlFor="admin-render-mode">Render Mode</label>
                  <select id="admin-render-mode" className="input" value={form.render_mode} onChange={e => handleField('render_mode', e.target.value)}>
                    <option value="overlay">Overlay</option>
                    <option value="replacement">Replacement</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  {(['torso_ratio', 'shoulder_ratio', 'sleeve_ratio', 'drape_factor'] as const).map(key => (
                    <div key={key}>
                      <label className="label" htmlFor={`admin-${key}`} title={FIELD_TIPS[key]}>
                        {key.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        <span
                          style={{ marginLeft: '0.375rem', color: 'var(--gray-400)', cursor: 'help', fontWeight: 400, fontSize: '0.75rem' }}
                          title={FIELD_TIPS[key]}
                        >
                          ⓘ
                        </span>
                      </label>
                      <input
                        id={`admin-${key}`}
                        type="number"
                        className="input"
                        step="0.05"
                        min={0}
                        max={2}
                        value={form[key]}
                        onChange={e => handleField(key, e.target.value)}
                        title={FIELD_TIPS[key]}
                      />
                      <p style={{ fontSize: '0.6875rem', color: 'var(--gray-400)', marginTop: '0.25rem', fontStyle: 'italic' }}>
                        {FIELD_TIPS[key].split(':')[1]?.trim()}
                      </p>
                    </div>
                  ))}
                </div>

                <div>
                  <label className="label" htmlFor="admin-display-image">Display Image (catalog photo)</label>
                  <input
                    id="admin-display-image"
                    ref={displayImageRef}
                    type="file"
                    accept="image/*"
                    className="input"
                    style={{ padding: '0.5rem', cursor: 'pointer' }}
                    required
                  />
                </div>

                <div>
                  <label className="label" htmlFor="admin-garment-image">Garment Image (clean on white background)</label>
                  <input
                    id="admin-garment-image"
                    ref={garmentImageRef}
                    type="file"
                    accept="image/*"
                    className="input"
                    style={{ padding: '0.5rem', cursor: 'pointer' }}
                    required
                  />
                </div>

                <button
                  type="submit"
                  id="admin-submit-btn"
                  className="btn btn-primary"
                  disabled={submitting}
                  style={{ marginTop: '0.5rem' }}
                >
                  {submitting ? 'Uploading...' : 'Upload Garment'}
                </button>
              </form>
            </div>

            {/* --- GARMENTS LIST --- */}
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.5rem', letterSpacing: '-0.01em' }}>
                Existing Garments ({garments.length})
              </h2>

              {loadingGarments ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'var(--gray-200)' }}>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} style={{ display: 'flex', gap: '1rem', padding: '1rem', background: 'var(--white)', alignItems: 'center' }}>
                      <div className="skeleton" style={{ width: '56px', height: '72px', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div className="skeleton" style={{ height: '14px', marginBottom: '8px', borderRadius: '4px' }} />
                        <div className="skeleton" style={{ height: '12px', width: '50%', borderRadius: '4px' }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : garments.length === 0 ? (
                <p style={{ color: 'var(--gray-400)', fontSize: '0.875rem', padding: '2rem', textAlign: 'center', border: '1px solid var(--gray-200)' }}>
                  No garments yet. Upload one above!
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'var(--gray-200)' }}>
                  {garments.map(g => (
                    <div
                      key={g._id}
                      style={{
                        display: 'flex',
                        gap: '1rem',
                        padding: '1rem',
                        background: 'var(--white)',
                        alignItems: 'center',
                      }}
                    >
                      <div style={{ position: 'relative', width: '56px', height: '72px', flexShrink: 0, background: 'var(--gray-100)' }}>
                        {g.image_url && (
                          <Image src={g.image_url} alt={g.name} fill sizes="56px" style={{ objectFit: 'cover' }} />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {g.name}
                        </div>
                        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                          <span className="pill pill-gray">{g.category}</span>
                          <span className="pill pill-gray">{g.fit_type}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(g)}
                        disabled={deletingId === g._id}
                        aria-label={`Delete ${g.name}`}
                        style={{
                          background: 'none',
                          border: '1.5px solid var(--gray-200)',
                          cursor: 'pointer',
                          padding: '0.5rem',
                          color: 'var(--gray-400)',
                          display: 'flex',
                          transition: 'all 150ms',
                          flexShrink: 0,
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = '#ef4444'
                          e.currentTarget.style.color = '#ef4444'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = 'var(--gray-200)'
                          e.currentTarget.style.color = 'var(--gray-400)'
                        }}
                      >
                        {deletingId === g._id ? (
                          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                            <circle cx="8" cy="8" r="6" strokeDasharray="20" strokeDashoffset="5" />
                          </svg>
                        ) : (
                          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3,6 5,6 13,6" />
                            <path d="M5,6V14a1,1,0,0,0,1,1h6a1,1,0,0,0,1-1V6M7,6V4a1,1,0,0,1,1-1h2a1,1,0,0,1,1,1V6" />
                          </svg>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <style>{`
        @media (min-width: 900px) {
          .admin-grid { grid-template-columns: 420px 1fr !important; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  )
}

export default function AdminPage() {
  return (
    <ToastProvider>
      <AdminContent />
    </ToastProvider>
  )
}
