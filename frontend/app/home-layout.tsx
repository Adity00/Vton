import type { Metadata } from 'next'
import { Suspense } from 'react'

export const metadata: Metadata = {
  title: 'VTON — Virtual Try-On',
  description: 'Try on any garment virtually before you buy. AI-powered size recommendation and fit analysis.',
}

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div style={{ minHeight: '100vh' }} />}>{children}</Suspense>
}
