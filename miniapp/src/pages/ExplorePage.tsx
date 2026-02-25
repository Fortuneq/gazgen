import { useState, useEffect, useRef, useCallback } from 'react'
import type { Post } from '../types'
import { getPosts } from '../api'
import CategoryPills from '../components/CategoryPills'
import ImageGrid, { SkeletonGrid } from '../components/ImageGrid'

export default function ExplorePage() {
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

  return (
    <div className="safe-bottom">
      <div style={styles.header}>
        <h1 style={styles.title}>
          <span className="gradient-text">GasGen</span> Gallery
        </h1>
      </div>

      <CategoryPills selected={category} onSelect={handleCategorySelect} />

      {loading ? (
        <SkeletonGrid />
      ) : posts.length === 0 ? (
        <div style={styles.empty}>
          <p style={styles.emptyText}>No posts found</p>
        </div>
      ) : (
        <>
          <ImageGrid posts={posts} />
          {loadingMore && (
            <div style={styles.loadingMore}>
              <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%' }} />
            </div>
          )}
          <div ref={sentinelRef} style={{ height: 1 }} />
        </>
      )}
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
  empty: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  emptyText: {
    color: 'var(--text-tertiary)',
    fontSize: 15,
  },
  loadingMore: {
    display: 'flex',
    justifyContent: 'center',
    padding: '20px 0',
  },
}
