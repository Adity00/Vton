'use client'

import { useCallback, useRef, useState } from 'react'

interface PhotoUploadProps {
  onFileSelect: (file: File) => void
  previewUrl: string | null
  onClear: () => void
}

export default function PhotoUpload({ onFileSelect, previewUrl, onClear }: PhotoUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) return
      if (file.size > 10 * 1024 * 1024) {
        alert('File too large. Please use an image under 10MB.')
        return
      }
      onFileSelect(file)
    },
    [onFileSelect]
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  if (previewUrl) {
    return (
      <div style={{ position: 'relative' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewUrl}
          alt="Your photo preview"
          style={{
            width: '100%',
            maxHeight: '400px',
            objectFit: 'cover',
            display: 'block',
            background: 'var(--gray-100)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0)',
            display: 'flex',
            alignItems: 'flex-end',
            padding: '1rem',
            transition: 'background 200ms',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.3)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0)')}
        >
          <button
            onClick={onClear}
            className="btn btn-sm"
            style={{
              background: 'white',
              color: 'black',
              opacity: 0,
              transition: 'opacity 200ms',
            }}
            onMouseEnter={e => ((e.currentTarget.parentElement!.style.background = 'rgba(0,0,0,0.3)'), (e.currentTarget.style.opacity = '1'))}
            onMouseLeave={e => ((e.currentTarget.style.opacity = '0'))}
          >
            Change photo
          </button>
        </div>
        <button
          onClick={onClear}
          className="btn btn-sm btn-ghost"
          style={{ marginTop: '0.5rem', width: '100%' }}
        >
          Change photo
        </button>
      </div>
    )
  }

  return (
    <div>
      <div
        className={`upload-zone${isDragging ? ' drag-active' : ''}`}
        onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        id="photo-upload-zone"
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
          id="photo-upload-input"
          aria-label="Upload your photo"
          style={{ display: 'none' }}
        />
        <div style={{ pointerEvents: 'none' }}>
          <div style={{ marginBottom: '1rem' }}>
            <svg
              width="40"
              height="40"
              fill="none"
              stroke="var(--gray-400)"
              strokeWidth="1.5"
              style={{ margin: '0 auto 0.75rem', display: 'block' }}
            >
              <rect x="2" y="6" width="36" height="28" rx="3" />
              <circle cx="20" cy="20" r="6" />
              <path d="M2 14h6l3-5h18l3 5h6" />
            </svg>
          </div>
          <p
            style={{
              fontSize: '0.9375rem',
              fontWeight: 600,
              color: 'var(--black)',
              marginBottom: '0.375rem',
            }}
          >
            Drop your photo here or click to upload
          </p>
          <p style={{ fontSize: '0.8125rem', color: 'var(--gray-400)', marginBottom: '1rem' }}>
            JPG, PNG, WEBP &mdash; Max 10MB
          </p>
          <p
            style={{
              fontSize: '0.75rem',
              color: 'var(--gray-400)',
              fontStyle: 'italic',
            }}
          >
            Front-facing photo works best. Upper body visible.
          </p>
        </div>
      </div>
    </div>
  )
}
