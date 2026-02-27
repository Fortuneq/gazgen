import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Post } from '../types'
import { getPosts } from '../api'
import CategoryPills from '../components/CategoryPills'
import ImageGrid, { SkeletonGrid } from '../components/ImageGrid'
import { useIsDesktop } from '../hooks/useMediaQuery'
import { Play, Zap } from 'lucide-react'

// --- Trending card data (static placeholders) ---
const TRENDING_CARDS = [
  { id: 1, title: 'Neon City', color: '#1a1a2e' },
  { id: 2, title: 'Golden Hour', color: '#2e1a0e' },
  { id: 3, title: 'Deep Ocean', color: '#0e1a2e' },
]

export default function ExplorePage() {
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()

  const [posts, setPosts] = useState<Post[]>([])
  const [category, setCategory] = useState<string | null>(null)
  const pageRef = useRef(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const fetchPosts = useCallback(async (cat: string | null, p: number, append: boolean) => {
    if (p === 1) setLoading(true)
    else setLoadingMore(true)

    try {
      const res = await getPosts(cat ?? undefined, p, 20)
      setPosts(prev => append ? [...prev, ...res.items] : res.items)
      setHasMore(res.has_more)
    } catch (err) {
      console.error('Failed to load posts:', err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    setPosts([])
    pageRef.current = 1
    setHasMore(true)
    fetchPosts(category, 1, false)
  }, [category, fetchPosts])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          pageRef.current += 1
          fetchPosts(category, pageRef.current, true)
        }
      },
      { rootMargin: '200px' }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, loading, category, fetchPosts])

  const handleCategorySelect = (cat: string | null) => {
    setCategory(cat)
  }

  // ── Shared: grid + infinite scroll section ──────────────────────────────
  const discoverSection = (
    <>
      {loading ? (
        <SkeletonGrid />
      ) : posts.length === 0 ? (
        <div style={s.empty}>
          <p style={s.emptyText}>No posts found</p>
        </div>
      ) : (
        <>
          <ImageGrid posts={posts} />
          {loadingMore && (
            <div style={s.loadingMore}>
              <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%' }} />
            </div>
          )}
          <div ref={sentinelRef} style={{ height: 1 }} />
        </>
      )}
    </>
  )

  // ── Animate banner (shared, different layout per breakpoint) ─────────────
  const animateBannerMobile = (
    <div
      style={s.animateBannerMobile}
      onClick={() => navigate('/animate')}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate('/animate')}
    >
      <div style={s.animateBannerContent}>
        <p style={s.animateBannerTitle}>Оживи фото ✨</p>
        <p style={s.animateBannerSub}>Преврати фото в видео с помощью AI</p>
      </div>
      <div style={s.animateBannerIcon}>
        <Play size={28} color="#0A0A0A" fill="#0A0A0A" />
      </div>
    </div>
  )

  const animateBannerDesktop = (
    <div
      style={s.animateBannerDesktop}
      onClick={() => navigate('/animate')}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate('/animate')}
    >
      <div>
        <p style={s.animateBannerTitleDesktop}>Оживи фото ✨</p>
        <p style={s.animateBannerSubDesktop}>
          Преврати фото в видео с помощью искусственного интеллекта
        </p>
        <button style={s.animateBannerBtn}>
          Попробовать
        </button>
      </div>
      <div style={s.animateBannerIconDesktop}>
        <Play size={56} color="#0A0A0A" fill="#0A0A0A" />
      </div>
    </div>
  )

  // ══════════════════════════════════════════════════════════════════════════
  // MOBILE LAYOUT
  // ══════════════════════════════════════════════════════════════════════════
  if (!isDesktop) {
    return (
      <div className="safe-bottom" style={s.mobileRoot}>
        {/* Header */}
        <div style={s.mobileHeader}>
          <h1 style={s.mobileTitle}>Photix</h1>
          <div style={s.creditsBadge}>
            <Zap size={14} color="#0A0A0A" fill="#0A0A0A" />
            <span style={s.creditsText}>100</span>
          </div>
        </div>

        {/* Category pills */}
        <CategoryPills selected={category} onSelect={handleCategorySelect} />

        {/* Trending section */}
        <div style={s.sectionBlock}>
          <p style={s.sectionTitle}>Trending 🔥</p>
          <div style={s.trendingScroll}>
            {TRENDING_CARDS.map((card) => (
              <div key={card.id} style={{ ...s.trendingCard, background: card.color }}>
                <div style={s.trendingOverlay}>
                  <p style={s.trendingCardTitle}>{card.title}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Animate banner */}
        <div style={s.sectionBlock}>
          {animateBannerMobile}
        </div>

        {/* Discover section */}
        <div style={s.sectionBlock}>
          <p style={s.sectionTitle}>Discover</p>
          {discoverSection}
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DESKTOP LAYOUT
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div style={s.desktopRoot}>
      {/* Hero */}
      <div style={s.heroOuter}>
        <div style={s.heroInner}>
          <h1 style={s.heroHeading}>Создавай с Photix</h1>
          <p style={s.heroSub}>
            Исследуй работы сообщества и создавай собственные шедевры с помощью AI
          </p>
          <button style={s.heroCta} onClick={() => navigate('/animate')}>
            Начать создавать
          </button>
        </div>
      </div>

      {/* Categories */}
      <div style={s.desktopSection}>
        <CategoryPills selected={category} onSelect={handleCategorySelect} />
      </div>

      {/* Best Works */}
      <div style={s.desktopSection}>
        <p style={s.desktopSectionTitle}>Best Works</p>
        {discoverSection}
      </div>

      {/* Animate banner */}
      <div style={s.desktopSection}>
        {animateBannerDesktop}
      </div>

      {/* Footer */}
      <footer style={s.footer}>
        <p style={s.footerText}>Photix © 2024</p>
      </footer>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────
const ACCENT = '#C4F82A'
const BG = '#0A0A0A'
const BORDER = '#27272A'
const TEXT_PRIMARY = '#FFFFFF'
const TEXT_SECONDARY = '#A1A1AA'
const TEXT_TERTIARY = '#52525B'

const s: Record<string, React.CSSProperties> = {
  // ── Mobile ──
  mobileRoot: {
    background: BG,
    minHeight: '100vh',
  },
  mobileHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 16px 4px',
  },
  mobileTitle: {
    fontFamily: 'var(--font-heading)',
    fontSize: 28,
    fontWeight: 800,
    color: TEXT_PRIMARY,
    margin: 0,
  },
  creditsBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    background: ACCENT,
    borderRadius: 100,
    padding: '6px 12px',
  },
  creditsText: {
    fontFamily: 'var(--font-body)',
    fontSize: 13,
    fontWeight: 700,
    color: '#0A0A0A',
  },
  sectionBlock: {
    marginTop: 20,
  },
  sectionTitle: {
    fontFamily: 'var(--font-heading)',
    fontSize: 18,
    fontWeight: 700,
    color: TEXT_PRIMARY,
    margin: '0 0 12px 0',
    padding: '0 16px',
  },
  trendingScroll: {
    display: 'flex',
    gap: 12,
    overflowX: 'auto',
    padding: '0 16px 8px',
    scrollbarWidth: 'none',
  },
  trendingCard: {
    flexShrink: 0,
    width: 280,
    height: 200,
    borderRadius: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  trendingOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '40px 16px 16px',
    background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)',
  },
  trendingCardTitle: {
    fontFamily: 'var(--font-heading)',
    fontSize: 16,
    fontWeight: 700,
    color: TEXT_PRIMARY,
    margin: 0,
  },
  // ── Animate banner – mobile ──
  animateBannerMobile: {
    margin: '0 16px',
    background: ACCENT,
    borderRadius: 20,
    padding: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
  },
  animateBannerContent: {
    flex: 1,
  },
  animateBannerTitle: {
    fontFamily: 'var(--font-heading)',
    fontSize: 20,
    fontWeight: 800,
    color: '#0A0A0A',
    margin: '0 0 4px 0',
  },
  animateBannerSub: {
    fontFamily: 'var(--font-body)',
    fontSize: 13,
    color: 'rgba(10,10,10,0.7)',
    margin: 0,
  },
  animateBannerIcon: {
    width: 48,
    height: 48,
    background: 'rgba(0,0,0,0.15)',
    borderRadius: 100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginLeft: 16,
  },
  // ── Desktop ──
  desktopRoot: {
    background: BG,
    minHeight: '100vh',
  },
  heroOuter: {
    background: 'linear-gradient(135deg, #111111 0%, #1a1a1a 50%, #0f1a00 100%)',
    borderBottom: `1px solid ${BORDER}`,
  },
  heroInner: {
    maxWidth: 1440,
    margin: '0 auto',
    padding: '80px 48px',
    height: 400,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  heroHeading: {
    fontFamily: 'var(--font-heading)',
    fontSize: 48,
    fontWeight: 800,
    color: TEXT_PRIMARY,
    margin: '0 0 16px 0',
  },
  heroSub: {
    fontFamily: 'var(--font-body)',
    fontSize: 18,
    color: TEXT_SECONDARY,
    margin: '0 0 32px 0',
    maxWidth: 480,
  },
  heroCta: {
    fontFamily: 'var(--font-body)',
    fontSize: 16,
    fontWeight: 700,
    color: '#0A0A0A',
    background: ACCENT,
    border: 'none',
    borderRadius: 100,
    padding: '14px 32px',
    cursor: 'pointer',
    alignSelf: 'flex-start',
  },
  desktopSection: {
    maxWidth: 1440,
    margin: '0 auto',
    padding: '32px 48px 0',
  },
  desktopSectionTitle: {
    fontFamily: 'var(--font-heading)',
    fontSize: 24,
    fontWeight: 700,
    color: TEXT_PRIMARY,
    margin: '0 0 16px 0',
  },
  // ── Animate banner – desktop ──
  animateBannerDesktop: {
    background: ACCENT,
    borderRadius: 20,
    padding: '40px 48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
  },
  animateBannerTitleDesktop: {
    fontFamily: 'var(--font-heading)',
    fontSize: 32,
    fontWeight: 800,
    color: '#0A0A0A',
    margin: '0 0 8px 0',
  },
  animateBannerSubDesktop: {
    fontFamily: 'var(--font-body)',
    fontSize: 16,
    color: 'rgba(10,10,10,0.7)',
    margin: '0 0 24px 0',
    maxWidth: 480,
  },
  animateBannerBtn: {
    fontFamily: 'var(--font-body)',
    fontSize: 15,
    fontWeight: 700,
    color: ACCENT,
    background: '#0A0A0A',
    border: 'none',
    borderRadius: 100,
    padding: '12px 28px',
    cursor: 'pointer',
  },
  animateBannerIconDesktop: {
    width: 100,
    height: 100,
    background: 'rgba(0,0,0,0.15)',
    borderRadius: 100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  // ── Footer ──
  footer: {
    maxWidth: 1440,
    margin: '0 auto',
    padding: '48px 48px 32px',
    textAlign: 'center',
  },
  footerText: {
    fontFamily: 'var(--font-body)',
    fontSize: 14,
    color: TEXT_TERTIARY,
    margin: 0,
  },
  // ── Shared ──
  empty: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  emptyText: {
    color: TEXT_TERTIARY,
    fontSize: 15,
    fontFamily: 'var(--font-body)',
  },
  loadingMore: {
    display: 'flex',
    justifyContent: 'center',
    padding: '20px 0',
  },
}
