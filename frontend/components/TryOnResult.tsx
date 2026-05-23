'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface TryOnResultProps {
  beforeUrl: string
  afterUrl: string
  processingMode: 'ai' | 'fallback'
}

export default function TryOnResult({ beforeUrl, afterUrl, processingMode }: TryOnResultProps) {
  const [sliderPos, setSliderPos] = useState(50)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const updatePos = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
    setSliderPos((x / rect.width) * 100)
  }, [])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true
    updatePos(e.clientX)
  }, [updatePos])

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    dragging.current = true
    updatePos(e.touches[0].clientX)
  }, [updatePos])

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => { if (dragging.current) updatePos(e.clientX) }
    const onTouchMove = (e: TouchEvent) => { if (dragging.current) updatePos(e.touches[0].clientX) }
    const stop = () => { dragging.current = false }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', stop)
    window.addEventListener('touchmove', onTouchMove)
    window.addEventListener('touchend', stop)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', stop)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', stop)
    }
  }, [updatePos])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') setSliderPos(p => Math.max(0, p - 2))
    if (e.key === 'ArrowRight') setSliderPos(p => Math.min(100, p + 2))
  }

  return (
    <div
      ref={containerRef}
      className="ba-slider"
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onKeyDown={onKeyDown}
      tabIndex={0}
      aria-label="Before and after slider"
      style={{ aspectRatio: '3/4', background: 'var(--gray-100)' }}
    >
      {/* Before (full width, shows on left) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={beforeUrl}
        alt="Before — original photo"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          userSelect: 'none',
          pointerEvents: 'none',
          display: 'block',
        }}
        draggable={false}
      />

      {/* After (clipped to show right portion) */}
      <div
        className="ba-slider-after"
        style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={afterUrl}
          alt="After — try-on result"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            userSelect: 'none',
            pointerEvents: 'none',
            display: 'block',
          }}
          draggable={false}
        />
      </div>

      {/* Divider line */}
      <div className="ba-slider-divider" style={{ left: `${sliderPos}%` }} />

      {/* Handle */}
      <div
        className="ba-slider-handle"
        style={{ left: `${sliderPos}%` }}
        aria-hidden="true"
      >
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="5,4 2,8 5,12" />
          <polyline points="11,4 14,8 11,12" />
        </svg>
      </div>

      {/* Labels */}
      <span className="ba-slider-label" style={{ left: '0.75rem' }}>Before</span>
      <span className="ba-slider-label" style={{ right: '0.75rem' }}>After</span>

      {/* Processing mode badge */}
      <div
        style={{
          position: 'absolute',
          top: '0.75rem',
          right: '0.75rem',
          padding: '0.25rem 0.625rem',
          background: processingMode === 'ai' ? 'var(--black)' : 'var(--gray-600)',
          color: 'white',
          fontSize: '0.6875rem',
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          borderRadius: '3px',
        }}
      >
        {processingMode === 'ai' ? 'AI Mode' : 'Basic Overlay'}
      </div>
    </div>
  )
}
