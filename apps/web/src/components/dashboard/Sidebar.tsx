'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  {
    label: 'Overview',
    href: '/dashboard',
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <rect x="1" y="1" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
        <rect x="8.5" y="1" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
        <rect x="1" y="8.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
        <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
      </svg>
    ),
  },
  {
    label: 'Returns',
    href: '/dashboard/returns',
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path d="M2 3h11M2 7h11M2 11h7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: 'ITC',
    href: '/dashboard/itc',
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path d="M1 7.5h13M7.5 2l5.5 5.5L7.5 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    label: 'Calendar',
    href: '/dashboard/compliance',
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <rect x="1" y="2.5" width="13" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M1 6h13" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M5 1v3M10 1v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: 'Tally Import',
    href: '/dashboard/tally',
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path d="M7.5 1v9M4 7l3.5 3.5L11 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M1.5 11v1.5a1 1 0 001 1h10a1 1 0 001-1V11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: 'TDS',
    href: '/dashboard/tds',
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <rect x="1" y="4" width="13" height="9" rx="1" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M5 4V3a2 2 0 014 0v1" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M7.5 8v2M6 9h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: 'Settings',
    href: '/dashboard/settings',
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M7.5 1.5v1M7.5 12.5v1M1.5 7.5h1M12.5 7.5h1M3.1 3.1l.7.7M11.2 11.2l.7.7M11.2 3.1l-.7.7M3.1 11.9l.7-.7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
  },
]

export default function Sidebar({ email, companyName }: { email: string; companyName: string }) {
  const pathname = usePathname()

  return (
    <aside style={{
      width: 220,
      minHeight: '100vh',
      background: '#1a1f14',
      borderRight: '0.5px solid rgba(90,122,58,0.15)',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      top: 0,
      left: 0,
      bottom: 0,
      zIndex: 40,
    }}>
      {/* Logo */}
      <div style={{
        padding: '20px 20px 16px',
        borderBottom: '0.5px solid rgba(90,122,58,0.1)',
      }}>
        <span style={{ fontSize: 20, fontWeight: 500, color: '#e8ddb5', letterSpacing: '-0.3px' }}>
          tav<span style={{ color: '#7ea860' }}>it</span>
        </span>
        <div style={{
          marginTop: 10,
          background: 'rgba(90,122,58,0.1)',
          border: '0.5px solid rgba(90,122,58,0.2)',
          borderRadius: 8,
          padding: '8px 10px',
        }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: '#7ea860', letterSpacing: '-0.1px', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {companyName}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(232,221,181,0.35)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {email}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
        {NAV.map(item => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 10px',
                borderRadius: 8,
                marginBottom: 2,
                background: active ? 'rgba(126,168,96,0.12)' : 'transparent',
                color: active ? '#9cc47a' : 'rgba(232,221,181,0.45)',
                fontSize: 13,
                fontWeight: active ? 500 : 400,
                textDecoration: 'none',
                transition: 'all 0.15s',
                border: active ? '0.5px solid rgba(126,168,96,0.25)' : '0.5px solid transparent',
              }}
            >
              <span style={{ flexShrink: 0 }}>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Sign out */}
      <div style={{ padding: '12px 10px', borderTop: '0.5px solid rgba(90,122,58,0.1)' }}>
        <form method="POST" action="/auth/signout">
          <button
            type="submit"
            style={{
              width: '100%',
              background: 'transparent',
              border: '0.5px solid rgba(232,221,181,0.1)',
              color: 'rgba(232,221,181,0.35)',
              fontSize: 12,
              padding: '8px 10px',
              borderRadius: 8,
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.15s',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M5 11H2a1 1 0 01-1-1V3a1 1 0 011-1h3M9 9l3-2.5L9 4M6 6.5h6" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Sign out
          </button>
        </form>
      </div>
    </aside>
  )
}
