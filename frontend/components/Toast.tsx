'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export type ToastType = 'success' | 'error' | 'info'

export interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastItemProps {
  toast: Toast
  onRemove: (id: string) => void
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  useEffect(() => {
    const t = setTimeout(() => onRemove(toast.id), 4000)
    return () => clearTimeout(t)
  }, [toast.id, onRemove])

  const icons = {
    success: (
      <svg width="16" height="16" fill="none" stroke="#22c55e" strokeWidth="2.5">
        <polyline points="3,8 6,11 13,4" />
      </svg>
    ),
    error: (
      <svg width="16" height="16" fill="none" stroke="#ef4444" strokeWidth="2.5">
        <line x1="4" y1="4" x2="12" y2="12" />
        <line x1="12" y1="4" x2="4" y2="12" />
      </svg>
    ),
    info: (
      <svg width="16" height="16" fill="none" stroke="#3b82f6" strokeWidth="2.5">
        <circle cx="8" cy="8" r="6" />
        <line x1="8" y1="7" x2="8" y2="11" />
        <circle cx="8" cy="5" r="0.5" fill="#3b82f6" />
      </svg>
    ),
  }

  return (
    <div className={`toast toast-${toast.type}`} role="alert">
      {icons[toast.type]}
      <span>{toast.message}</span>
      <button
        onClick={() => onRemove(toast.id)}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--gray-400)',
          cursor: 'pointer',
          marginLeft: 'auto',
          padding: '0',
          display: 'flex',
        }}
        aria-label="Dismiss notification"
      >
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="2" y1="2" x2="12" y2="12" />
          <line x1="12" y1="2" x2="2" y2="12" />
        </svg>
      </button>
    </div>
  )
}

// ---- Context ----
import { createContext, useContext, useCallback } from 'react'

interface ToastContextValue {
  addToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue>({ addToast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(t => [...t, { id, message, type }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(t => t.filter(toast => toast.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {mounted &&
        createPortal(
          <div className="toast-container">
            {toasts.map(toast => (
              <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  )
}
