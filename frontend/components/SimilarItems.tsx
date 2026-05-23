'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Garment } from '@/lib/types'

interface SimilarItemsProps {
  garments: Garment[]
}

export default function SimilarItems({ garments }: SimilarItemsProps) {
  const router = useRouter()

  if (!garments.length) return null

  return (
    <div>
      <div className="section-title">Similar Styles</div>
      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          overflowX: 'auto',
          paddingBottom: '0.5rem',
          scrollbarWidth: 'none',
        }}
      >
        {garments.map(g => (
          <button
            key={g._id}
            onClick={() => router.push(`/?garment=${g._id}`)}
            style={{
              flexShrink: 0,
              width: '120px',
              background: 'none',
              border: '1.5px solid var(--gray-200)',
              cursor: 'pointer',
              padding: 0,
              textAlign: 'left',
              transition: 'border-color 150ms',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--black)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--gray-200)')}
            aria-label={`Try on ${g.name}`}
          >
            <div style={{ position: 'relative', aspectRatio: '3/4', background: 'var(--gray-100)' }}>
              {g.image_url && (
                <Image
                  src={g.image_url}
                  alt={g.name}
                  fill
                  sizes="120px"
                  style={{ objectFit: 'cover' }}
                />
              )}
            </div>
            <div style={{ padding: '0.5rem' }}>
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  color: 'var(--black)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {g.name}
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--gray-400)', textTransform: 'capitalize' }}>
                {g.fit_type}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
