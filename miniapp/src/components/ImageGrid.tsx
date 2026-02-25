import type { Post } from '../types'
import PostCard from './PostCard'

interface ImageGridProps {
  posts: Post[]
  startIndex?: number
}

export default function ImageGrid({ posts, startIndex = 0 }: ImageGridProps) {
  return (
    <div style={styles.grid}>
      <div style={styles.column}>
        {posts
          .filter((_, i) => i % 2 === 0)
          .map((post, i) => (
            <PostCard key={post.id} post={post} index={startIndex + i * 2} />
          ))}
      </div>
      <div style={styles.column}>
        {posts
          .filter((_, i) => i % 2 === 1)
          .map((post, i) => (
            <PostCard key={post.id} post={post} index={startIndex + i * 2 + 1} />
          ))}
      </div>
    </div>
  )
}

export function SkeletonGrid() {
  return (
    <div style={styles.grid}>
      <div style={styles.column}>
        {[200, 260, 220].map((h, i) => (
          <div key={i} className="skeleton" style={{ ...styles.skeletonCard, height: h }} />
        ))}
      </div>
      <div style={styles.column}>
        {[240, 200, 250].map((h, i) => (
          <div key={i} className="skeleton" style={{ ...styles.skeletonCard, height: h }} />
        ))}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
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
  skeletonCard: {
    borderRadius: 'var(--radius-md)',
    marginBottom: 8,
  },
}
