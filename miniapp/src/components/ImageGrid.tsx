import type { Post } from "../types";
import { PostCard } from "./PostCard";

interface ImageGridProps {
  posts: Post[];
  columns?: number;
  gap?: number;
  onPostClick?: (post: Post) => void;
}

export function ImageGrid({ posts, columns = 2, gap = 4, onPostClick }: ImageGridProps) {
  const cols: { post: Post; originalIndex: number }[][] = Array.from({ length: columns }, () => []);
  posts.forEach((p, i) => cols[i % columns].push({ post: p, originalIndex: i }));

  return (
    <div style={{ display: "flex", gap, padding: "0 20px" }}>
      {cols.map((col, ci) => (
        <div key={ci} style={{ flex: 1, display: "flex", flexDirection: "column", gap }}>
          {col.map(({ post, originalIndex }) => (
            <PostCard
              key={post.id}
              post={post}
              onClick={() => onPostClick?.(post)}
              eager={originalIndex < 4}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
