'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useAuth } from '@/lib/authContext'

export default function Navbar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  
  // Safely get auth context since it might not be wrapped in some pages during dev
  const authContext = useAuth()
  const user = authContext?.user
  const logout = authContext?.logout

  const links = [
    { href: '/', label: 'Try On' },
    { href: '/catalog', label: 'Catalog' },
    { href: '/history', label: 'History' },
    { href: '/admin', label: 'Admin' },
  ]

  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        <Link href="/" className="navbar-logo">
          VTON
        </Link>

        {/* Desktop links */}
        <div className="navbar-links" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="navbar-link"
              style={{
                color: pathname === link.href ? 'var(--black)' : undefined,
                fontWeight: pathname === link.href ? 600 : undefined,
              }}
            >
              {link.label}
            </Link>
          ))}
          
          <div style={{ width: '1px', height: '24px', background: 'var(--gray-200)', margin: '0 0.5rem' }}></div>
          
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Link href="/profile" style={{ fontSize: '0.875rem', color: 'var(--gray-500)', textDecoration: 'none' }}>
                Hi, {user.name || "Profile"}
              </Link>
              <button 
                onClick={logout}
                style={{ 
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '0.875rem', color: 'var(--gray-500)'
                }}
              >
                Logout
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Link href="/login" style={{ fontSize: '0.875rem', color: 'var(--black)', textDecoration: 'none' }}>Log In</Link>
              <Link href="/register" style={{ 
                fontSize: '0.875rem', 
                background: 'var(--black)', 
                color: 'white', 
                padding: '0.375rem 0.75rem', 
                borderRadius: '999px',
                textDecoration: 'none' 
              }}>Sign Up</Link>
            </div>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          aria-label="Toggle menu"
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0.5rem',
          }}
          className="mobile-menu-btn"
        >
          <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
            {mobileOpen ? (
              <>
                <line x1="3" y1="3" x2="19" y2="19" />
                <line x1="19" y1="3" x2="3" y2="19" />
              </>
            ) : (
              <>
                <line x1="3" y1="7" x2="19" y2="7" />
                <line x1="3" y1="12" x2="19" y2="12" />
                <line x1="3" y1="17" x2="19" y2="17" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          style={{
            position: 'absolute',
            top: '64px',
            left: 0,
            right: 0,
            background: 'var(--white)',
            borderBottom: '1px solid var(--gray-200)',
            padding: '1rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            zIndex: 99,
          }}
        >
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="navbar-link"
              onClick={() => setMobileOpen(false)}
              style={{ fontSize: '1rem', padding: '0.25rem 0' }}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 640px) {
          .navbar-links { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </nav>
  )
}
