import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import type { PostDetail } from '../types'
import { getPost, getImageUrl, getReferenceUrl } from '../api'
import { tg, haptic, hapticSuccess } from '../telegram'
import { useIsDesktop } from '../hooks/useMediaQuery'
import { Download, Sparkles, Play, Copy, Check } from 'lucide-react'

export default function DetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()
  const [post, setPost] = useState<PostDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  const goBack = useCallback(() => {
    navigate(-1)
  }, [navigate])

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getPost(Number(id))
      .then(setPost)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (tg) {
      tg.BackButton.show()
      tg.BackButton.onClick(goBack)
    }
    return () => {
      if (tg) {
        tg.BackButton.hide()
        tg.BackButton.offClick(goBack)
      }
    }
  }, [goBack])

  const handleCopyPrompt = async () => {
    if (!post?.prompt) return
    try {
      await navigator.clipboard.writeText(post.prompt)
      hapticSuccess()
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      console.error('Failed to copy')
    }
  }

  const handleGenerate = () => {
    haptic('medium')
    navigate(`/generate/${post?.id}`)
  }

  const handleDownload = async () => {
    if (!post) return
    haptic('light')
    try {
      const url = getImageUrl(post.id)
      const res = await fetch(url)
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `photix-${post.id}.jpg`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch {
      console.error('Failed to download')
    }
  }

  const handleAnimate = () => {
    haptic('medium')
    navigate('/animate')
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0A0A0A' }}>
        <div className="skeleton" style={{ width: '100%', height: 400 }} />
        <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="skeleton" style={{ width: '60%', height: 20, borderRadius: 8 }} />
          <div className="skeleton" style={{ width: '100%', height: 80, borderRadius: 16 }} />
        </div>
      </div>
    )
  }

  if (!post) {
    return (
      <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#52525B', fontSize: 15, fontFamily: 'var(--font-body)' }}>Пост не найден</span>
      </div>
    )
  }

  const contentSection = (
    <div style={isDesktop ? styles.desktopContent : styles.mobileContent}>
      {/* Category + Date row */}
      <div className="animate-in stagger-1" style={styles.categoryRow}>
        <span style={styles.badge}>
          {post.category_emoji} {post.category}
        </span>
        <span style={styles.date}>
          {new Date(post.created_at).toLocaleDateString('ru-RU')}
        </span>
      </div>

      {/* Prompt card */}
      {post.prompt && (
        <div className="animate-in stagger-2" style={styles.promptCard}>
          <div style={styles.promptHeader}>
            <span style={styles.promptLabel}>Промпт</span>
            <button style={styles.copyBtn} onClick={handleCopyPrompt}>
              {copied ? (
                <>
                  <Check size={14} color="#C4F82A" />
                  <span style={{ color: '#C4F82A' }}>Скопировано</span>
                </>
              ) : (
                <>
                  <Copy size={14} color="#A1A1AA" />
                  <span>Копировать</span>
                </>
              )}
            </button>
          </div>
          <p style={styles.promptText}>{post.prompt}</p>
        </div>
      )}

      {/* Reference images */}
      {post.references.length > 0 && (
        <div className="animate-in stagger-3">
          <p style={styles.sectionTitle}>Референсы</p>
          <div style={styles.refScroll} className="hide-scrollbar">
            {post.references.map((ref) => (
              <img
                key={ref.order}
                src={getReferenceUrl(post.id, ref.order)}
                alt={`Референс ${ref.order}`}
                style={styles.refThumb}
                loading="lazy"
              />
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="animate-in stagger-4" style={styles.actions}>
        <button
          style={styles.accentBtn}
          onClick={handleGenerate}
        >
          <Sparkles size={18} color="#0A0A0A" />
          <span>Создать похожее</span>
        </button>

        <button style={styles.surfaceBtn} onClick={handleDownload}>
          <Download size={18} color="#FFFFFF" />
          <span>Скачать</span>
        </button>

        <button style={styles.surfaceBtn} onClick={handleAnimate}>
          <Play size={18} color="#FFFFFF" />
          <span>Анимировать</span>
        </button>
      </div>
    </div>
  )

  if (isDesktop) {
    return (
      <div style={styles.desktopPage} className="safe-bottom">
        <div style={styles.desktopInner}>
          <div className="animate-in" style={styles.desktopImageCol}>
            <img
              src={getImageUrl(post.id)}
              alt={post.prompt || 'Generated image'}
              style={styles.desktopImage}
            />
          </div>
          <div style={styles.desktopContentCol}>
            {contentSection}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.mobilePage} className="safe-bottom">
      <div className="animate-in" style={styles.mobileImageWrap}>
        <img
          src={getImageUrl(post.id)}
          alt={post.prompt || 'Generated image'}
          style={styles.mobileImage}
        />
      </div>
      {contentSection}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  // Mobile
  mobilePage: {
    minHeight: '100vh',
    background: '#0A0A0A',
  },
  mobileImageWrap: {
    width: '100%',
    maxHeight: '60vh',
    overflow: 'hidden',
  },
  mobileImage: {
    width: '100%',
    maxHeight: '60vh',
    display: 'block',
    objectFit: 'cover',
  },
  mobileContent: {
    padding: '20px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },

  // Desktop
  desktopPage: {
    minHeight: '100vh',
    background: '#0A0A0A',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '40px 24px',
  },
  desktopInner: {
    display: 'flex',
    gap: 40,
    width: '100%',
    maxWidth: 1200,
    alignItems: 'flex-start',
  },
  desktopImageCol: {
    width: 560,
    flexShrink: 0,
  },
  desktopImage: {
    width: '100%',
    display: 'block',
    borderRadius: 20,
    objectFit: 'cover',
  },
  desktopContentCol: {
    flex: 1,
    minWidth: 0,
  },
  desktopContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },

  // Shared
  categoryRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    fontWeight: 500,
    fontFamily: 'var(--font-body)',
    color: '#FFFFFF',
    background: '#18181B',
    padding: '6px 14px',
    borderRadius: 100,
    border: '1px solid #27272A',
  },
  date: {
    fontSize: 13,
    fontFamily: 'var(--font-body)',
    color: '#52525B',
  },
  promptCard: {
    padding: 16,
    background: '#18181B',
    border: '1px solid #27272A',
    borderRadius: 20,
  },
  promptHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  promptLabel: {
    fontSize: 11,
    fontWeight: 700,
    fontFamily: 'var(--font-heading)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.07em',
    color: '#52525B',
  },
  copyBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '4px 10px',
    fontSize: 12,
    fontWeight: 500,
    fontFamily: 'var(--font-body)',
    color: '#A1A1AA',
    background: '#18181B',
    border: '1px solid #27272A',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'background 0.15s ease',
  },
  promptText: {
    fontSize: 14,
    lineHeight: 1.6,
    fontFamily: 'var(--font-body)',
    color: '#FFFFFF',
    margin: 0,
    whiteSpace: 'pre-wrap' as const,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    fontFamily: 'var(--font-heading)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.07em',
    color: '#52525B',
    margin: '0 0 10px',
  },
  refScroll: {
    display: 'flex',
    gap: 8,
    overflowX: 'auto' as const,
    WebkitOverflowScrolling: 'touch' as const,
    paddingBottom: 4,
  },
  refThumb: {
    width: 80,
    height: 80,
    objectFit: 'cover' as const,
    borderRadius: 8,
    border: '1px solid #27272A',
    flexShrink: 0,
  },
  actions: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 10,
    marginTop: 4,
  },
  accentBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    padding: '14px',
    background: '#C4F82A',
    border: 'none',
    borderRadius: 16,
    color: '#0A0A0A',
    fontSize: 15,
    fontWeight: 700,
    fontFamily: 'var(--font-heading)',
    cursor: 'pointer',
    transition: 'opacity 0.15s ease',
  },
  surfaceBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    padding: '14px',
    background: '#18181B',
    border: '1px solid #27272A',
    borderRadius: 16,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 600,
    fontFamily: 'var(--font-heading)',
    cursor: 'pointer',
    transition: 'background 0.15s ease',
  },
}
