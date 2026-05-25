'use client'

import { useEffect, useState } from 'react'
import { FitResult } from '@/lib/types'

interface SizeRecommendationProps {
  fitResult: FitResult
}

const FIT_COLORS: Record<string, string> = {
  'tight fit': '#2563eb',
  'regular fit': '#16a34a',
  oversized: '#ea580c',
}

export default function SizeRecommendation({ fitResult }: SizeRecommendationProps) {
  const [scoreWidth, setScoreWidth] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setScoreWidth((fitResult?.fit_score || 0) * 100), 100)
    return () => clearTimeout(t)
  }, [fitResult?.fit_score])

  const safeFitLabel = fitResult?.fit_label || 'Unknown'
  const safeFitScore = fitResult?.fit_score || 0

  const fitColor = FIT_COLORS[safeFitLabel.toLowerCase()] || 'var(--gray-500)'
  const scorePercent = Math.round(safeFitScore * 100)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

      {/* Recommended Size */}
      <div>
        <div className="section-title">Your Size</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
          <span
            style={{
              fontSize: '4rem',
              fontWeight: 900,
              letterSpacing: '-0.05em',
              lineHeight: 1,
              color: 'var(--black)',
            }}
          >
            {fitResult?.recommended_size || 'N/A'}
          </span>
          <span style={{ fontSize: '0.875rem', color: 'var(--gray-400)', lineHeight: 1.4 }}>
            based on your<br />body proportions
          </span>
        </div>
      </div>

      {/* Fit Style */}
      <div>
        <div className="section-title">Fit Style</div>
        <div
          style={{
            display: 'inline-block',
            padding: '0.375rem 0.875rem',
            background: fitColor + '15',
            color: fitColor,
            fontSize: '0.875rem',
            fontWeight: 700,
            letterSpacing: '0.02em',
            textTransform: 'capitalize',
            marginBottom: '0.875rem',
            borderRadius: '3px',
          }}
        >
          {safeFitLabel}
        </div>

        <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginBottom: '0.5rem' }}>
          Fit confidence: {scorePercent}%
        </div>
        <div className="fit-score-bar">
          <div className="fit-score-fill" style={{ width: `${scoreWidth}%`, background: fitColor }} />
        </div>
      </div>

      {/* Fit Notes */}
      <div>
        <div className="section-title">Fit Notes</div>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {(fitResult?.fit_notes || []).map((note, i) => (
            <li
              key={i}
              style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', fontSize: '0.875rem', color: 'var(--gray-700)' }}
            >
              <svg
                width="16"
                height="16"
                fill="none"
                stroke={fitColor}
                strokeWidth="2"
                style={{ flexShrink: 0, marginTop: '2px' }}
              >
                <circle cx="8" cy="8" r="6" />
                <polyline points="5.5,8 7,9.5 10.5,6" />
              </svg>
              {note}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
