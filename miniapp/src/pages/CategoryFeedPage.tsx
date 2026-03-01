import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Layout } from "../components/Layout";
import { ImageGrid } from "../components/ImageGrid";
import { api } from "../api";
import { useIsDesktop } from "../hooks/useMediaQuery";
import { haptic } from "../telegram";
import type { Post, FeedFilter } from "../types";
import { ArrowLeft } from "lucide-react";
import { getTagDisplayName, getCategoryDisplayName } from "../categoryNames";

const FEED_FILTERS: { key: FeedFilter; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "popular", label: "Популярное" },
  { key: "new", label: "Новое" },
];

// Known tag names — used to decide whether to filter by tag or category
const TAG_NAMES = new Set([
  "male", "female", "couple", "group",
  "landscape", "object", "animal", "anime",
  "abstract", "fashion", "portrait", "fullbody",
]);

export default function CategoryFeedPage() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<FeedFilter>("all");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);

  const isTag = name ? TAG_NAMES.has(name) : false;

  useEffect(() => {
    if (!name) return;
    setLoading(true);
    const params = isTag
      ? { tag: name, page: 1, limit: 20 }
      : { category: name, page: 1, limit: 20 };
    api.getPosts(params)
      .then((data) => {
        setPosts(data.items);
        setTotal(data.total);
        setHasMore(data.has_more);
        setPage(1);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [name, isTag]);

  const loadMore = useCallback(() => {
    if (!name || !hasMore) return;
    const nextPage = page + 1;
    const params = isTag
      ? { tag: name, page: nextPage, limit: 20 }
      : { category: name, page: nextPage, limit: 20 };
    api.getPosts(params)
      .then((data) => {
        setPosts((prev) => [...prev, ...data.items]);
        setHasMore(data.has_more);
        setPage(nextPage);
      })
      .catch(console.error);
  }, [name, page, hasMore, isTag]);

  const handlePostClick = useCallback((post: Post) => {
    haptic();
    navigate(`/photo/${post.id}`);
  }, [navigate]);

  const displayName = name
    ? (isTag ? getTagDisplayName(name) : getCategoryDisplayName(name))
    : "";

  const FilterChips = () => (
    <div style={{ display: "flex", gap: 8 }}>
      {FEED_FILTERS.map((f) => {
        const active = filter === f.key;
        return (
          <button
            key={f.key}
            onClick={() => { haptic(); setFilter(f.key); }}
            style={{
              padding: "8px 14px", borderRadius: 100,
              background: active ? "#C4F82A" : "#18181B",
              border: active ? "none" : "1px solid #27272A",
              color: active ? "#000000" : "#A1A1AA",
              fontFamily: "var(--font-body)", fontSize: 13,
              fontWeight: active ? 600 : 500, cursor: "pointer",
            }}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );

  if (isDesktop) {
    return (
      <Layout>
        <div style={{
          padding: "32px 0", display: "flex", flexDirection: "column", gap: 24,
        }}>
          {/* Header Row */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button
              onClick={() => navigate(-1)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                padding: 0, display: "flex", alignItems: "center",
              }}
            >
              <ArrowLeft size={24} color="#FFFFFF" />
            </button>
            <span style={{
              fontFamily: "var(--font-primary)", fontSize: 28, fontWeight: 700, color: "#FFFFFF",
            }}>{displayName}</span>
            <span style={{
              fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 500, color: "#A1A1AA",
            }}>{total} фото</span>
          </div>

          {/* Filter Chips */}
          <FilterChips />

          {/* Masonry Grid - 4 columns on desktop */}
          <div style={{ display: "flex", gap: 16 }}>
            {Array.from({ length: 4 }, (_, colIdx) => {
              const colPosts = posts.filter((_, i) => i % 4 === colIdx);
              const heights = [380, 300, 350, 260];
              return (
                <div key={colIdx} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
                  {colPosts.map((post, i) => (
                    <button
                      key={post.id}
                      onClick={() => handlePostClick(post)}
                      style={{
                        width: "100%", height: heights[i % heights.length],
                        borderRadius: 16, overflow: "hidden",
                        border: "1px solid #27272A", background: "#18181B",
                        padding: 0, cursor: "pointer",
                      }}
                    >
                      {post.has_result_image && (
                        <img
                          src={api.getResultImageUrl(post.id)}
                          alt={post.prompt || ""}
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                          loading="lazy"
                        />
                      )}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Load More */}
          {hasMore && (
            <div style={{ display: "flex", justifyContent: "center", padding: "16px 0" }}>
              <button
                onClick={loadMore}
                style={{
                  padding: "12px 32px", borderRadius: 100,
                  background: "#18181B", border: "1px solid #27272A",
                  color: "#A1A1AA", fontFamily: "var(--font-body)",
                  fontSize: 14, cursor: "pointer",
                }}
              >
                Загрузить ещё
              </button>
            </div>
          )}
        </div>
      </Layout>
    );
  }

  // Mobile layout
  return (
    <Layout title={displayName} showBack>
      {/* Stats */}
      <div style={{ padding: "4px 20px" }}>
        <span style={{
          fontFamily: "var(--font-body)", fontSize: 13, color: "#52525B",
        }}>
          {total.toLocaleString()} фото
        </span>
      </div>

      {/* Filter Chips */}
      <div style={{ padding: "8px 20px" }}>
        <FilterChips />
      </div>

      {/* Masonry Feed */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <ImageGrid
          posts={posts}
          columns={2}
          gap={8}
          onPostClick={handlePostClick}
        />
      </div>

      {/* Load More */}
      {hasMore && (
        <div style={{ display: "flex", justifyContent: "center", padding: "16px 0" }}>
          <button
            onClick={loadMore}
            style={{
              padding: "10px 24px", borderRadius: 100,
              background: "#18181B", border: "1px solid #27272A",
              color: "#A1A1AA", fontFamily: "var(--font-body)",
              fontSize: 13, cursor: "pointer",
            }}
          >
            Загрузить ещё
          </button>
        </div>
      )}
    </Layout>
  );
}
