'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { getGarments } from '@/lib/api'
import { Garment } from '@/lib/types'

const CATEGORIES = ['All', 'tshirt', 'hoodie', 'jacket', 'shirt']
const CATEGORY_LABELS: Record<string, string> = {
  All: 'All',
  tshirt: 'T-Shirts',
  hoodie: 'Hoodies',
  jacket: 'Jackets',
  shirt: 'Shirts',
}

const FIT_COLORS: Record<string, string> = {
  tight: '#2563eb',
  regular: '#16a34a',
  oversized: '#ea580c',
}

export default function CatalogPage() {
  const router = useRouter()
  const [garments, setGarments] = useState<Garment[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('All')
  const [selectedGarment, setSelectedGarment] = useState<Garment | null>(null)

  useEffect(() => {
    setLoading(true)
    const cat = activeCategory === 'All' ? undefined : activeCategory
    getGarments(cat)
      .then(setGarments)
      .finally(() => setLoading(false))
  }, [activeCategory])

  const openDrawer = (g: Garment) => setSelectedGarment(g)
  const closeDrawer = () => setSelectedGarment(null)

  return (
    <>
      <Navbar />
      <main>
        {/* Header */}
        <div
          style={{
            borderBottom: '1px solid var(--gray-200)',
            padding: '2.5rem 0 0',
          }}
        >
          <div className="container">
            <h1
              style={{
                fontSize: 'clamp(1.75rem, 4vw, 3rem)',
                fontWeight: 800,
                letterSpacing: '-0.04em',
                marginBottom: '1.5rem',
              }}
            >
              Catalog
            </h1>
            <div className="filter-tabs">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  id={`catalog-tab-${cat.toLowerCase()}`}
                  className={`filter-tab${activeCategory === cat ? ' active' : ''}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="container" style={{ padding: '2rem 1.5rem' }}>
          {loading ? (
            <div className="garment-grid">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i}>
                  <div className="skeleton" style={{ aspectRatio: '3/4' }} />
                  <div style={{ padding: '0.75rem' }}>
                    <div className="skeleton" style={{ height: '14px', marginBottom: '8px', borderRadius: '4px' }} />
                    <div className="skeleton" style={{ height: '12px', width: '60%', borderRadius: '4px' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : garments.length === 0 ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--gray-400)' }}>
              No garments found.
            </div>
          ) : (
            <div className="garment-grid">
              {garments.map(g => (
                <button
                  key={g._id}
                  onClick={() => openDrawer(g)}
                  style={{
                    background: 'var(--white)',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    padding: 0,
                    display: 'block',
                    width: '100%',
                    transition: 'transform 150ms',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.01)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                  id={`catalog-item-${g._id}`}
                  aria-label={`View ${g.name}`}
                >
                  <div style={{ position: 'relative', aspectRatio: '3/4', background: 'var(--gray-100)' }}>
                    {g.image_url && (
                      <Image
                        src={g.image_url}
                        alt={g.name}
                        fill
                        sizes="(max-width: 640px) 50vw, 25vw"
                        style={{ objectFit: 'cover' }}
                      />
                    )}
                  </div>
                  <div style={{ padding: '0.75rem' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem' }}>{g.name}</div>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      <span className="pill pill-gray">{g.category}</span>
                      <span
                        className="pill"
                        style={{
                          background: (FIT_COLORS[g.fit_type] || '#000') + '15',
                          color: FIT_COLORS[g.fit_type] || '#000',
                        }}
                      >
                        {g.fit_type}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Drawer */}
      {selectedGarment && (
        <>
          <div className="drawer-overlay" onClick={closeDrawer} />
          <div className="drawer">
            {/* Close button */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                padding: '1rem 1.25rem',
                borderBottom: '1px solid var(--gray-200)',
              }}
            >
              <button
                onClick={closeDrawer}
                aria-label="Close drawer"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--gray-400)',
                  display: 'flex',
                }}
              >
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="4" y1="4" x2="16" y2="16" />
                  <line x1="16" y1="4" x2="4" y2="16" />
                </svg>
              </button>
            </div>

            {/* Image */}
            <div style={{ position: 'relative', aspectRatio: '3/4', background: 'var(--gray-100)' }}>
              {selectedGarment.image_url && (
                <Image
                  src={selectedGarment.image_url}
                  alt={selectedGarment.name}
                  fill
                  style={{ objectFit: 'cover' }}
                  sizes="420px"
                />
              )}
            </div>

            {/* Details */}
            <div style={{ padding: '1.5rem' }}>
              <h2
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                  marginBottom: '0.5rem',
                }}
              >
                {selectedGarment.name}
              </h2>

              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <span className="pill pill-gray">{selectedGarment.category}</span>
                <span
                  className="pill"
                  style={{
                    background: (FIT_COLORS[selectedGarment.fit_type] || '#000') + '15',
                    color: FIT_COLORS[selectedGarment.fit_type] || '#000',
                  }}
                >
                  {selectedGarment.fit_type}
                </span>
              </div>

              {/* Technical fit data */}
              <div style={{ marginBottom: '1.5rem' }}>
                <p className="section-title">Technical Fit Data</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  {[
                    { label: 'Torso Ratio', value: selectedGarment.torso_ratio, tip: '1.3 = long, 0.9 = cropped' },
                    { label: 'Shoulder Ratio', value: selectedGarment.shoulder_ratio, tip: '1.15 = wide drop' },
                    { label: 'Sleeve Ratio', value: selectedGarment.sleeve_ratio, tip: '0.85 = standard length' },
                    { label: 'Drape Factor', value: selectedGarment.drape_factor, tip: '0.8 = very loose, 0.2 = fitted' },
                  ].map(({ label, value, tip }) => (
                    <div
                      key={label}
                      style={{
                        padding: '0.875rem',
                        background: 'var(--gray-50)',
                        border: '1px solid var(--gray-200)',
                      }}
                    >
                      <div style={{ fontSize: '0.6875rem', color: 'var(--gray-400)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {label}
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
                        {value.toFixed(2)}
                      </div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--gray-400)', fontStyle: 'italic' }}>
                        {tip}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={() => {
                  closeDrawer()
                  router.push(`/?garment=${selectedGarment._id}`)
                }}
                className="btn btn-primary"
                style={{ width: '100%' }}
                id={`try-on-cta-${selectedGarment._id}`}
              >
                Try This On
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="4" y1="8" x2="12" y2="8" />
                  <polyline points="9,5 12,8 9,11" />
                </svg>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
