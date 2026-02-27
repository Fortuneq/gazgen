import { type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Compass, Search, Sparkles, User } from 'lucide-react'
import { haptic } from '../telegram'
import { useIsDesktop } from '../hooks/useMediaQuery'

const mobileNavItems = [
  { to: '/', label: 'Explore', icon: Compass },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/generate', label: 'Create', icon: Sparkles },
  { to: '/profile', label: 'Profile', icon: User },
]

const desktopNavLinks = [
  { to: '/', label: 'Explore' },
  { to: '/search', label: 'Search' },
  { to: '/generate', label: 'Create' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/animate', label: 'Animate' },
]

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const isDesktop = useIsDesktop()

  const isDetailPage = location.pathname.startsWith('/post/')
  const isNavVisible = !isDetailPage

  const getIsActive = (to: string) => {
    if (to === '/') return location.pathname === '/'
    return location.pathname.startsWith(to)
  }

  return (
    <div style={{ minHeight: '100vh', minBlockSize: '100dvh' }}>
      {isDesktop && (
        <header style={styles.desktopHeader}>
          <div style={styles.desktopHeaderInner}>
            <NavLink to="/" style={styles.desktopLogo}>
              <span style={styles.desktopLogoText}>Photix</span>
              <span style={styles.desktopLogoDot}>.</span>
            </NavLink>

            <nav style={styles.desktopNav}>
              {desktopNavLinks.map((link) => {
                const isActive = getIsActive(link.to)
                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    style={{
                      ...styles.desktopNavLink,
                      color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                    }}
                  >
                    {link.label}
                  </NavLink>
                )
              })}
            </nav>

            <div style={styles.desktopCreditsBadge}>
              <span style={styles.desktopCreditsText}>100 ⚡</span>
            </div>
          </div>
        </header>
      )}

      <main style={isDesktop ? styles.mainDesktop : undefined}>
        {children}
      </main>

      {!isDesktop && isNavVisible && (
        <nav style={styles.mobileNav}>
          <div style={styles.mobileNavInner}>
            {mobileNavItems.map((item) => {
              const isActive = getIsActive(item.to)
              const IconComponent = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => haptic('light')}
                  style={styles.mobileNavItem}
                >
                  <div style={{
                    ...styles.mobileIconWrap,
                    color: isActive ? 'var(--accent)' : 'var(--text-tertiary)',
                  }}>
                    <IconComponent size={24} strokeWidth={1.8} />
                  </div>
                  <span style={{
                    ...styles.mobileNavLabel,
                    color: isActive ? 'var(--accent)' : 'var(--text-tertiary)',
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
  desktopHeader: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    background: 'rgba(10, 10, 10, 0.9)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderBottom: '1px solid var(--border)',
    height: 'var(--nav-height)',
  },
  desktopHeaderInner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: 1280,
    margin: '0 auto',
    padding: '0 32px',
    height: '100%',
  },
  desktopLogo: {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    textDecoration: 'none',
    flexShrink: 0,
  },
  desktopLogoText: {
    fontFamily: 'var(--font-heading)',
    fontSize: 24,
    fontWeight: 800,
    color: '#FFFFFF',
    lineHeight: 1,
  },
  desktopLogoDot: {
    fontFamily: 'var(--font-heading)',
    fontSize: 24,
    fontWeight: 800,
    color: 'var(--accent)',
    lineHeight: 1,
  },
  desktopNav: {
    display: 'flex',
    alignItems: 'center',
    gap: 32,
  },
  desktopNavLink: {
    fontFamily: 'var(--font-body)',
    fontSize: 15,
    fontWeight: 500,
    textDecoration: 'none',
    transition: 'color 0.2s ease',
  },
  desktopCreditsBadge: {
    display: 'flex',
    alignItems: 'center',
    padding: '6px 14px',
    background: 'var(--accent)',
    borderRadius: 'var(--radius-pill)',
    flexShrink: 0,
  },
  desktopCreditsText: {
    fontFamily: 'var(--font-heading)',
    fontSize: 14,
    fontWeight: 700,
    color: '#0A0A0A',
  },
  mainDesktop: {
    paddingTop: 'var(--nav-height)',
  },
  mobileNav: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    background: 'rgba(10, 10, 10, 0.9)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderTop: '1px solid var(--border)',
    paddingBottom: 'var(--safe-area-bottom)',
  },
  mobileNavInner: {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 'var(--nav-height)',
    maxWidth: 480,
    margin: '0 auto',
  },
  mobileNavItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    textDecoration: 'none',
    WebkitTapHighlightColor: 'transparent',
  },
  mobileIconWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    transition: 'color 0.2s ease',
  },
  mobileNavLabel: {
    fontSize: 11,
    fontWeight: 500,
    transition: 'color 0.2s ease',
  },
}
