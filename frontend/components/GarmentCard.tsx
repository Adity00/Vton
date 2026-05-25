'use client'

import Image from 'next/image'
import { Garment } from '@/lib/types'

interface GarmentCardProps {
  garment: Garment
  isSelected: boolean
  onClick: () => void
  compact?: boolean
  priority?: boolean
}

const FIT_COLORS: Record<string, string> = {
  tight: 'pill-blue',
  regular: 'pill-green',
  oversized: 'pill-orange',
}

export default function GarmentCard({ garment, isSelected, onClick, compact = false, priority = false }: GarmentCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' || e.key === ' ' ? onClick() : null}
      className={`garment-card${isSelected ? ' selected' : ''}`}
      id={`garment-card-${garment._id}`}
    >
      <div style={{ position: 'relative', aspectRatio: '3/4', background: 'var(--gray-100)' }}>
        {garment.image_url ? (
          <Image
            src={garment.image_url}
            alt={garment.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            style={{ objectFit: 'cover' }}
            className="garment-card-img"
            priority={priority}
          />
        ) : (
          <div
            className="skeleton"
            style={{ position: 'absolute', inset: 0 }}
          />
        )}
        {isSelected && (
          <div
            style={{
              position: 'absolute',
              top: '0.5rem',
              right: '0.5rem',
              width: '24px',
              height: '24px',
              background: 'var(--black)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="12" height="12" fill="none" stroke="white" strokeWidth="2.5">
              <polyline points="2,6 5,9 10,3" />
            </svg>
          </div>
        )}
      </div>

      {!compact && (
        <div className="garment-card-body">
          <div className="garment-card-name">{garment.name}</div>
          <div className="garment-card-meta">
            <span className="pill pill-gray">{garment.category}</span>
            <span className={`pill ${FIT_COLORS[garment.fit_type] || 'pill-gray'}`}>
              {garment.fit_type}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
