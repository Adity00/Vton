'use client'

import { useEffect, useState, useRef } from 'react'

interface LoadingStateProps {
  isVisible: boolean
  onCancel?: () => void
}

const STEPS = [
  { until: 3, text: 'Analyzing your body proportions...' },
  { until: 8, text: 'Measuring shoulder and torso ratios...' },
  { until: 15, text: 'Adapting garment to your measurements...' },
  { until: 25, text: 'Running AI fitting model...' },
  { until: 45, text: 'Compositing final image...' },
  { until: Infinity, text: 'Almost there... (AI models can take up to 60s)' },
]

const TIPS = [
  'Tip: Front-facing mirror selfies work best',
  'Tip: Good lighting improves accuracy',
  'Tip: Try oversized fits for a relaxed look',
  'Tip: Neutral backgrounds help the AI model',
]

export default function LoadingState({ isVisible, onCancel }: LoadingStateProps) {
  const [elapsed, setElapsed] = useState(0)
  const [tipIndex, setTipIndex] = useState(0)
  const [msgOpacity, setMsgOpacity] = useState(1)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const tipRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (isVisible) {
      setElapsed(0)
      intervalRef.current = setInterval(() => {
        setElapsed(e => e + 1)
      }, 1000)
      tipRef.current = setInterval(() => {
        setMsgOpacity(0)
        setTimeout(() => {
          setTipIndex(i => (i + 1) % TIPS.length)
          setMsgOpacity(1)
        }, 300)
      }, 8000)
    } else {
      setElapsed(0)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (tipRef.current) clearInterval(tipRef.current)
    }
  }, [isVisible])

  if (!isVisible) return null

  // Progress: reaches 90% at 45s, stays there
  const progress = Math.min(90, (elapsed / 45) * 90)

  const currentStep = STEPS.find(s => elapsed < s.until)?.text ?? STEPS[STEPS.length - 1].text

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(8px)',
        zIndex: 500,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}
    >
      <div style={{ width: '100%', maxWidth: '480px', textAlign: 'center' }}>
        {/* Logo */}
        <div
          style={{
            fontSize: '1.25rem',
            fontWeight: 900,
            letterSpacing: '-0.05em',
            marginBottom: '3rem',
            color: 'var(--black)',
          }}
        >
          VTON
        </div>

        {/* Status message */}
        <div
          style={{
            fontSize: '1.25rem',
            fontWeight: 600,
            letterSpacing: '-0.02em',
            color: 'var(--black)',
            marginBottom: '2rem',
            minHeight: '2rem',
            transition: 'opacity 300ms ease',
          }}
        >
          {currentStep}
        </div>

        {/* Progress bar */}
        <div className="progress-bar-track" style={{ marginBottom: '0.75rem' }}>
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>

        {/* Time */}
        <div
          style={{
            fontSize: '0.8125rem',
            color: 'var(--gray-400)',
            marginBottom: '3rem',
          }}
        >
          {elapsed}s elapsed
        </div>

        {/* Tip */}
        <div
          style={{
            fontSize: '0.875rem',
            color: 'var(--gray-500)',
            transition: 'opacity 300ms ease',
            opacity: msgOpacity,
            marginBottom: '2rem',
          }}
        >
          {TIPS[tipIndex]}
        </div>

        {/* Cancel button — only after 60s */}
        {elapsed >= 60 && onCancel && (
          <button
            onClick={onCancel}
            className="btn btn-ghost btn-sm"
            style={{ marginTop: '1rem' }}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}
