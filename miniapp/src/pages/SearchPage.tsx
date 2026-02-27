import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { SearchResult } from '../types'
import { searchPosts, getImageUrl } from '../api'
import { haptic } from '../telegram'
import { SkeletonGrid } from '../components/ImageGrid'
import { Search as SearchIcon, X, Clock, TrendingUp } from 'lucide-react'

const RECENT_SEARCHES_KEY = 'photix-recent-searches'
const MAX_RECENT = 10

const POPULAR_TAGS = ['Портрет', 'Пейзаж', 'Аниме', 'Киберпанк', 'Фэнтези', 'Минимализм']

function getRecentSearches(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]')
  } catch {
    return []
  }
}

function saveRecentSearch(query: string) {
  const trimmed = query.trim()
  if (!trimmed) return
  const existing = getRecentSearches().filter((q) => q !== trimmed)
  const updated = [trimmed, ...existing].slice(0, MAX_RECENT)
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
}

function clearRecentSearches() {
  localStorage.removeItem(RECENT_SEARCHES_KEY)
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [inputFocused, setInputFocused] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>(getRecentSearches)
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
      saveRecentSearch(q.trim())
      setRecentSearches(getRecentSearches())
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

  const handleChipClick = (tag: string) => {
    haptic('light')
    setQuery(tag)
  }

  const handleClearRecent = () => {
    haptic('light')
    clearRecentSearches()
    setRecentSearches([])
  }

  const showEmpty = !query.trim()

  return (
    <div className="safe-bottom" style={{ minHeight: '100vh', background: '#0A0A0A' }}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Поиск</h1>
        <button
          style={styles.closeBtn}
          onClick={() => { haptic('light'); navigate(-1) }}
          aria-label="Закрыть"
        >
          <X size={20} color="#A1A1AA" />
        </button>
      </div>

      {/* Search input */}
      <div style={styles.inputWrap}>
        <div style={{ position: 'relative', flex: 1 }}>
          <SearchIcon
            size={18}
            color="#52525B"
            style={styles.searchIcon}
          />
          <input
            type="text"
            placeholder="Опиши, что хочешь найти..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            style={{
              ...styles.input,
              borderColor: inputFocused ? '#C4F82A' : '#27272A',
            }}
            autoFocus
          />
          {query && (
            <button
              style={styles.clearBtn}
              onClick={() => { haptic('light'); setQuery('') }}
              aria-label="Очистить"
            >
              <X size={16} color="#52525B" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ padding: '0 16px 16px' }}>
          <SkeletonGrid />
        </div>
      ) : showEmpty ? (
        <div style={{ padding: '8px 16px 24px' }}>
          {/* Recent searches */}
          {recentSearches.length > 0 && (
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <div style={styles.sectionTitleRow}>
                  <Clock size={15} color="#A1A1AA" />
                  <span style={styles.sectionTitle}>Недавние</span>
                </div>
                <button style={styles.clearTextBtn} onClick={handleClearRecent}>
                  Очистить
                </button>
              </div>
              <div style={styles.chipsRow}>
                {recentSearches.map((tag) => (
                  <button
                    key={tag}
                    style={styles.chip}
                    onClick={() => handleChipClick(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Popular section */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <div style={styles.sectionTitleRow}>
                <TrendingUp size={15} color="#A1A1AA" />
                <span style={styles.sectionTitle}>Популярное 🔥</span>
              </div>
            </div>
            <div style={styles.chipsRow}>
              {POPULAR_TAGS.map((tag) => (
                <button
                  key={tag}
                  style={styles.chip}
                  onClick={() => handleChipClick(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Initial state prompt */}
          {!searched && (
            <div style={styles.emptyInitial}>
              <SearchIcon size={44} color="#52525B" style={{ opacity: 0.5, marginBottom: 14 }} />
              <p style={styles.emptyText}>Начни поиск</p>
              <p style={styles.emptyHint}>Введи описание — найдём похожие работы</p>
            </div>
          )}
        </div>
      ) : results.length === 0 ? (
        <div style={styles.empty}>
          <p style={styles.emptyText}>Ничего не найдено</p>
          <p style={styles.emptyHint}>Попробуй другое описание</p>
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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: '#FFFFFF',
    fontFamily: 'var(--font-heading)',
    margin: 0,
  },
  closeBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: '#18181B',
    border: '1px solid #27272A',
    cursor: 'pointer',
    flexShrink: 0,
  },
  inputWrap: {
    position: 'sticky',
    top: 0,
    zIndex: 10,
    padding: '12px 16px 14px',
    background: '#0A0A0A',
    display: 'flex',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: 16,
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
    zIndex: 1,
  } as React.CSSProperties,
  input: {
    width: '100%',
    padding: '14px 44px 14px 48px',
    background: '#18181B',
    border: '1px solid #27272A',
    borderRadius: 16,
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'var(--font-body)',
    outline: 'none',
    transition: 'border-color 0.2s ease',
    boxSizing: 'border-box',
  },
  clearBtn: {
    position: 'absolute',
    right: 14,
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    background: '#27272A',
    borderRadius: '50%',
    cursor: 'pointer',
    border: 'none',
  } as React.CSSProperties,
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#A1A1AA',
    fontFamily: 'var(--font-body)',
  },
  clearTextBtn: {
    fontSize: 13,
    color: '#C4F82A',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    padding: 0,
  },
  chipsRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  chip: {
    padding: '8px 14px',
    background: '#18181B',
    border: '1px solid #27272A',
    borderRadius: 100,
    color: '#A1A1AA',
    fontSize: 13,
    fontFamily: 'var(--font-body)',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    transition: 'border-color 0.15s ease, color 0.15s ease',
  },
  emptyInitial: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    paddingTop: 48,
    textAlign: 'center',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '50vh',
    textAlign: 'center',
    padding: '0 32px',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 500,
    color: '#A1A1AA',
    fontFamily: 'var(--font-body)',
    margin: 0,
  },
  emptyHint: {
    fontSize: 14,
    color: '#52525B',
    fontFamily: 'var(--font-body)',
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
    flexDirection: 'column' as const,
  },
}

const cardStyles: Record<string, React.CSSProperties> = {
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    background: '#18181B',
    border: '1px solid #27272A',
    cursor: 'pointer',
    marginBottom: 8,
    breakInside: 'avoid',
  },
  imageWrap: {
    position: 'relative',
    width: '100%',
    minHeight: 180,
    overflow: 'hidden',
    background: '#18181B',
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
    color: '#0A0A0A',
    background: '#C4F82A',
    borderRadius: 100,
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
    color: '#A1A1AA',
    background: 'rgba(255,255,255,0.06)',
    padding: '3px 8px',
    borderRadius: 100,
    alignSelf: 'flex-start',
  },
  prompt: {
    fontSize: 13,
    lineHeight: 1.4,
    color: '#A1A1AA',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    margin: 0,
  },
}
