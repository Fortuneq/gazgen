import { type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { haptic } from '../telegram'

const navItems = [
  {
    to: '/',
    label: 'Explore',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    to: '/search',
    label: 'Search',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
  {
    to: '/generate/0',
    label: 'Generate',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z" />
        <path d="M18 14l1 3.5L22.5 18l-3.5 1L18 22.5l-1-3.5L13.5 18l3.5-1L18 14z" />
      </svg>
    ),
  },
]

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()

  const isNavVisible = !location.pathname.startsWith('/post/') &&
    !location.pathname.match(/^\/generate\/[1-9]/)

  return (
    <div style={{ minHeight: '100vh', minBlockSize: '100dvh' }}>
      <main>{children}</main>

      {isNavVisible && (
        <nav style={styles.nav}>
          <div style={styles.navInner}>
            {navItems.map((item) => {
              const isActive = item.to === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.to)

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => haptic('light')}
                  style={{
                    ...styles.navItem,
                    color: isActive ? 'transparent' : 'var(--text-secondary)',
                  }}
                >
                  <div style={{
                    ...styles.iconWrap,
                    ...(isActive ? styles.iconActive : {}),
                  }}>
                    {item.icon}
                  </div>
                  <span style={{
                    ...styles.navLabel,
                    ...(isActive ? {
                      background: 'var(--accent-gradient)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    } : {}),
                  }}>
                    {item.label}
                  </span>
                </NavLink>
              )
            })}
          </div>
        </nav>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    background: 'rgba(15, 17, 19, 0.85)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderTop: '1px solid var(--border)',
    paddingBottom: 'var(--safe-area-bottom)',
  },
  navInner: {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 'var(--nav-height)',
    maxWidth: 480,
    margin: '0 auto',
  },
  navItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    textDecoration: 'none',
    WebkitTapHighlightColor: 'transparent',
    transition: 'color 0.2s ease',
  },
  iconWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    color: 'var(--text-secondary)',
    transition: 'color 0.2s ease',
  },
  iconActive: {
    color: 'var(--accent)',
  },
  navLabel: {
    fontSize: 11,
    fontWeight: 500,
    color: 'var(--text-secondary)',
    transition: 'color 0.2s ease',
  },
}
