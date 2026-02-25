import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import type { PostDetail } from '../types'
import { getPost, getImageUrl, getReferenceUrl } from '../api'
import { tg, haptic, hapticSuccess } from '../telegram'

export default function DetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
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

  if (loading) {
    return (
      <div style={styles.page}>
        <div className="skeleton" style={{ width: '100%', height: 400 }} />
        <div style={styles.content}>
          <div className="skeleton" style={{ width: '60%', height: 20, marginBottom: 12 }} />
          <div className="skeleton" style={{ width: '100%', height: 80 }} />
        </div>
      </div>
    )
  }

  if (!post) {
    return (
      <div style={styles.page}>
        <div style={styles.empty}>Post not found</div>
      </div>
    )
  }

  return (
    <div style={styles.page} className="safe-bottom">
      <div className="animate-in" style={styles.imageWrap}>
        <img
          src={getImageUrl(post.id)}
          alt={post.prompt || 'Generated image'}
          style={styles.image}
        />
      </div>

      <div style={styles.content}>
        <div className="animate-in stagger-1" style={styles.categoryRow}>
          <span style={styles.badge}>
            {post.category_emoji} {post.category}
          </span>
          <span style={styles.date}>
            {new Date(post.created_at).toLocaleDateString()}
          </span>
        </div>

        {post.prompt && (
          <div className="animate-in stagger-2 glass-card" style={styles.promptCard}>
            <div style={styles.promptHeader}>
              <span style={styles.promptLabel}>Prompt</span>
              <button style={styles.copyBtn} onClick={handleCopyPrompt}>
                {copied ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                )}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <p style={styles.promptText}>{post.prompt}</p>
          </div>
        )}

        {post.references.length > 0 && (
          <div className="animate-in stagger-3">
            <p style={styles.sectionTitle}>Reference Images</p>
            <div style={styles.refScroll} className="hide-scrollbar">
              {post.references.map((ref) => (
                <img
                  key={ref.order}
                  src={getReferenceUrl(post.id, ref.order)}
                  alt={`Reference ${ref.order}`}
                  style={styles.refThumb}
                  loading="lazy"
                />
              ))}
            </div>
          </div>
        )}

        <button
          className="animate-in stagger-4 accent-btn"
          style={styles.generateBtn}
          onClick={handleGenerate}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z" />
          </svg>
          Generate Like This
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
  },
  imageWrap: {
    width: '100%',
    maxHeight: '60vh',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    display: 'block',
    objectFit: 'cover',
  },
  content: {
    padding: '20px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  categoryRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text)',
    background: 'var(--surface)',
    padding: '6px 12px',
    borderRadius: 'var(--radius-pill)',
    border: '1px solid var(--border)',
  },
  date: {
    fontSize: 13,
    color: 'var(--text-tertiary)',
  },
  promptCard: {
    padding: 16,
  },
  promptHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  promptLabel: {
    fontSize: 12,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--text-tertiary)',
  },
  copyBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 10px',
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--text-secondary)',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    transition: 'background 0.15s ease',
  },
  promptText: {
    fontSize: 14,
    lineHeight: 1.6,
    color: 'var(--text)',
    margin: 0,
    whiteSpace: 'pre-wrap',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--text-tertiary)',
    margin: '0 0 10px',
  },
  refScroll: {
    display: 'flex',
    gap: 8,
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
    paddingBottom: 4,
  },
  refThumb: {
    width: 80,
    height: 80,
    objectFit: 'cover',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)',
    flexShrink: 0,
  },
  generateBtn: {
    width: '100%',
    marginTop: 8,
  },
  empty: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    color: 'var(--text-tertiary)',
    fontSize: 15,
  },
}
