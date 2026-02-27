import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Post } from '../types'
import { getImageUrl } from '../api'
import { haptic } from '../telegram'

interface PostCardProps {
  post: Post
  index: number
}

export default function PostCard({ post, index }: PostCardProps) {
  const navigate = useNavigate()
  const [loaded, setLoaded] = useState(false)

  const staggerClass = `stagger-${Math.min(index % 8 + 1, 8)}`

  const handleClick = () => {
    haptic('light')
    navigate(`/post/${post.id}`)
  }

  return (
    <div
      className={`animate-in ${staggerClass}`}
      style={styles.card}
      onClick={handleClick}
      role="button"
      tabIndex={0}
    >
      <div style={styles.imageWrap}>
        {!loaded && <div className="skeleton" style={styles.skeleton} />}
        <img
          src={getImageUrl(post.id)}
          alt={post.prompt || 'Generated image'}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          style={{
            ...styles.image,
            opacity: loaded ? 1 : 0,
          }}
        />
      </div>
      <div style={styles.info}>
        <span style={styles.badge}>
          {post.category_emoji} {post.category}
        </span>
        {post.prompt && (
          <p style={styles.prompt}>{post.prompt}</p>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    cursor: 'pointer',
    transition: 'transform 0.15s ease',
    breakInside: 'avoid',
  },
  imageWrap: {
    position: 'relative',
    width: '100%',
    minHeight: 200,
    overflow: 'hidden',
    background: 'var(--surface)',
  },
  skeleton: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
  },
  image: {
    width: '100%',
    display: 'block',
    objectFit: 'cover',
    transition: 'opacity 0.3s ease',
    border: 'none',
  },
  info: {
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--text-secondary)',
    background: 'rgba(255,255,255,0.06)',
    padding: '4px 10px',
    borderRadius: 'var(--radius-pill)',
    alignSelf: 'flex-start',
  },
  prompt: {
    fontSize: 13,
    lineHeight: 1.4,
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-body)',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    margin: 0,
  },
}
