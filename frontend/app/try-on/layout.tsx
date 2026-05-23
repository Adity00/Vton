import type { Metadata } from 'next'
import { Suspense } from 'react'

export const metadata: Metadata = {
  title: 'Your Try-On — VTON',
  description: 'View your virtual try-on result with AI-powered fit analysis.',
}

export default function TryOnLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div style={{ minHeight: '100vh' }} />}>{children}</Suspense>
}
