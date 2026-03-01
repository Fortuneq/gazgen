import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { api } from "../api";
import { useIsDesktop } from "../hooks/useMediaQuery";
import { haptic } from "../telegram";
import type { Tag } from "../types";
import { Search } from "lucide-react";

export default function CategoriesPage() {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const [tags, setTags] = useState<Tag[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getTags()
      .then(setTags)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = search
    ? tags.filter((t) =>
        t.display_name.toLowerCase().includes(search.toLowerCase()) ||
        t.name.toLowerCase().includes(search.toLowerCase())
      )
    : tags;

  const handleTagClick = useCallback((name: string) => {
    haptic();
    navigate(`/category/${name}`);
  }, [navigate]);

  // Tag card component
  const TagCard = ({ tag, height }: { tag: Tag; height: number }) => (
    <button
      onClick={() => handleTagClick(tag.name)}
      style={{
        position: "relative", width: "100%", height, borderRadius: 16,
        overflow: "hidden", background: "#18181B", border: "1px solid #27272A",
        padding: 0, cursor: "pointer", flexShrink: 0, textAlign: "left",
      }}
    >
      <img
        src={api.getTagCoverUrl(tag.name)}
        alt={tag.display_name}
        style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%", objectFit: "cover",
        }}
        loading="lazy"
      />
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 60,
        background: "linear-gradient(to bottom, #0A0A0A00, #0A0A0ACC)",
      }} />
      <span style={{
        position: "absolute", left: 12, top: 10,
        fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 500, color: "#A1A1AA",
      }}>
        {tag.post_count.toLocaleString()}
      </span>
      <span style={{
        position: "absolute", left: 12, bottom: 12,
        fontFamily: "var(--font-primary)", fontSize: 15, fontWeight: 700, color: "#FFFFFF",
      }}>
        {tag.emoji} {tag.display_name}
      </span>
    </button>
  );

  if (isDesktop) {
    return (
      <Layout>
        <div style={{ padding: "32px 0", display: "flex", flexDirection: "column", gap: 16 }}>
          <h1 style={{
            fontFamily: "var(--font-primary)", fontSize: 28, fontWeight: 700,
            color: "#FFFFFF", margin: 0,
          }}>
            Все категории
          </h1>

          {/* Grid - 4 columns */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {Array.from({ length: Math.ceil(filtered.length / 4) }, (_, ri) => (
              <div key={ri} style={{ display: "flex", gap: 16 }}>
                {filtered.slice(ri * 4, ri * 4 + 4).map((tag) => (
                  <div key={tag.name} style={{ flex: 1 }}>
                    <TagCard tag={tag} height={260} />
                  </div>
                ))}
                {filtered.slice(ri * 4, ri * 4 + 4).length < 4 &&
                  Array.from({ length: 4 - filtered.slice(ri * 4, ri * 4 + 4).length }).map((_, i) => (
                    <div key={`spacer-${i}`} style={{ flex: 1 }} />
                  ))}
              </div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  // Mobile layout
  return (
    <Layout title="Категории" showBack>
      {/* Search */}
      <div style={{ padding: "8px 20px" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "#18181B", borderRadius: 16, padding: "12px 16px",
          border: "1px solid #27272A",
        }}>
          <Search size={16} color="#52525B" />
          <input
            placeholder="Поиск категорий..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              background: "none", border: "none", outline: "none", flex: 1,
              color: "#FFFFFF", fontFamily: "var(--font-body)", fontSize: 14,
            }}
          />
        </div>
      </div>

      {/* Tag Grid - 2 columns */}
      <div style={{
        padding: "12px 20px", display: "flex", flexDirection: "column", gap: 12,
      }}>
        {Array.from({ length: Math.ceil(filtered.length / 2) }, (_, ri) => (
          <div key={ri} style={{ display: "flex", gap: 12 }}>
            {filtered.slice(ri * 2, ri * 2 + 2).map((tag) => (
              <div key={tag.name} style={{ flex: 1 }}>
                <TagCard tag={tag} height={140} />
              </div>
            ))}
            {filtered.slice(ri * 2, ri * 2 + 2).length < 2 && <div style={{ flex: 1 }} />}
          </div>
        ))}
      </div>
    </Layout>
  );
}
