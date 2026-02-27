import type { Post } from '../types'
import PostCard from './PostCard'

interface ImageGridProps {
  posts: Post[]
  startIndex?: number
}

export default function ImageGrid({ posts, startIndex = 0 }: ImageGridProps) {
  return (
    <>
      <style>{`
        .image-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
          padding: 0 16px;
        }
        @media (min-width: 768px) {
          .image-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
          }
        }
        @media (min-width: 1440px) {
          .image-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
          }
        }
      `}</style>
      <div className="image-grid">
        {posts.map((post, i) => (
          <PostCard key={post.id} post={post} index={startIndex + i} />
        ))}
      </div>
    </>
  )
}

export function SkeletonGrid() {
  return (
    <>
      <style>{`
        .image-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
          padding: 0 16px;
        }
        @media (min-width: 768px) {
          .image-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
          }
        }
        @media (min-width: 1440px) {
          .image-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
          }
        }
      `}</style>
      <div className="image-grid">
        {[200, 260, 220, 240, 200, 250].map((h, i) => (
          <div key={i} className="skeleton" style={{ borderRadius: 'var(--radius-md)', height: h }} />
        ))}
      </div>
    </>
  )
}
