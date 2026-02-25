import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { SearchResult } from '../types'
import { searchPosts, getImageUrl } from '../api'
import { haptic } from '../telegram'
import { SkeletonGrid } from '../components/ImageGrid'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const navigate = useNavigate()

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      setSearched(false)
      return
    }
    setLoading(true)
    setSearched(true)
    try {
      const data = await searchPosts(q.trim(), 20)
      setResults(data)
    } catch (err) {
      console.error('Search failed:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(query), 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, doSearch])

  const handleCardClick = (id: number) => {
    haptic('light')
    navigate(`/post/${id}`)
  }

  return (
    <div className="safe-bottom">
      <div style={styles.header}>
        <h1 style={styles.title}>Search</h1>
      </div>

      <div style={styles.inputWrap}>
        <svg style={styles.searchIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Describe what you want to find..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={styles.input}
          autoFocus
        />
        {query && (
          <button style={styles.clearBtn} onClick={() => setQuery('')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ padding: '0 0 16px' }}>
          <SkeletonGrid />
        </div>
      ) : !searched ? (
        <div style={styles.empty}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16, opacity: 0.5 }}>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <p style={styles.emptyText}>Describe what you want to find</p>
          <p style={styles.emptyHint}>Search by content, style, or mood</p>
        </div>
      ) : results.length === 0 ? (
        <div style={styles.empty}>
          <p style={styles.emptyText}>No results found</p>
          <p style={styles.emptyHint}>Try a different description</p>
        </div>
      ) : (
        <div style={styles.grid}>
          <div style={styles.column}>
            {results
              .filter((_, i) => i % 2 === 0)
              .map((result, i) => (
                <SearchCard
                  key={result.id}
                  result={result}
                  index={i * 2}
                  onClick={() => handleCardClick(result.id)}
                />
              ))}
          </div>
          <div style={styles.column}>
            {results
              .filter((_, i) => i % 2 === 1)
              .map((result, i) => (
                <SearchCard
                  key={result.id}
                  result={result}
                  index={i * 2 + 1}
                  onClick={() => handleCardClick(result.id)}
                />
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SearchCard({ result, index, onClick }: { result: SearchResult; index: number; onClick: () => void }) {
  const [loaded, setLoaded] = useState(false)
  const staggerClass = `stagger-${Math.min(index % 8 + 1, 8)}`
  const similarity = Math.round(result.similarity * 100)

  return (
    <div
      className={`animate-in ${staggerClass}`}
      style={cardStyles.card}
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      <div style={cardStyles.imageWrap}>
        {!loaded && <div className="skeleton" style={cardStyles.skeleton} />}
        <img
          src={getImageUrl(result.id)}
          alt={result.prompt || 'Result'}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          style={{
            ...cardStyles.image,
            opacity: loaded ? 1 : 0,
          }}
        />
        <div style={cardStyles.similarityBadge}>
          {similarity}%
        </div>
      </div>
      <div style={cardStyles.info}>
        <span style={cardStyles.badge}>
          {result.category_emoji} {result.category}
        </span>
        {result.prompt && (
          <p style={cardStyles.prompt}>{result.prompt}</p>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    padding: '20px 16px 4px',
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: 'var(--text)',
  },
  inputWrap: {
    position: 'sticky',
    top: 0,
    zIndex: 10,
    padding: '12px 16px 16px',
    background: 'var(--bg)',
    display: 'flex',
    alignItems: 'center',
    gap: 0,
  },
  searchIcon: {
    position: 'absolute',
    left: 30,
    color: 'var(--text-tertiary)',
    pointerEvents: 'none',
  },
  input: {
    flex: 1,
    padding: '12px 40px 12px 44px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text)',
    fontSize: 15,
    outline: 'none',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    transition: 'border-color 0.2s ease',
  },
  clearBtn: {
    position: 'absolute',
    right: 26,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '50vh',
    textAlign: 'center',
    padding: '0 32px',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 500,
    color: 'var(--text-secondary)',
    margin: 0,
  },
  emptyHint: {
    fontSize: 14,
    color: 'var(--text-tertiary)',
    margin: '6px 0 0',
  },
  grid: {
    display: 'flex',
    gap: 8,
    padding: '0 16px',
  },
  column: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
}

const cardStyles: Record<string, React.CSSProperties> = {
  card: {
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    cursor: 'pointer',
    marginBottom: 8,
    breakInside: 'avoid',
  },
  imageWrap: {
    position: 'relative',
    width: '100%',
    minHeight: 180,
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
  },
  similarityBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: '3px 8px',
    fontSize: 11,
    fontWeight: 600,
    color: '#fff',
    background: 'rgba(168, 85, 247, 0.85)',
    borderRadius: 'var(--radius-pill)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  },
  info: {
    padding: '10px 12px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 11,
    fontWeight: 500,
    color: 'var(--text-secondary)',
    background: 'rgba(255,255,255,0.06)',
    padding: '3px 8px',
    borderRadius: 'var(--radius-pill)',
    alignSelf: 'flex-start',
  },
  prompt: {
    fontSize: 13,
    lineHeight: 1.4,
    color: 'var(--text-secondary)',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    margin: 0,
  },
}
