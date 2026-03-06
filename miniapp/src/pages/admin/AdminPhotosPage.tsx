import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../../components/Layout";
import { api } from "../../api";
import type { AdminPost, AdminCategory } from "../../types";
import { ArrowLeft, Trash2, Search, ChevronDown } from "lucide-react";
import { haptic } from "../../telegram";

export default function AdminPhotosPage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingCat, setEditingCat] = useState<number | null>(null);
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.adminGetPosts({
        page, limit,
        category: catFilter || undefined,
        search: search || undefined,
      });
      setPosts(data.items);
      setTotal(data.total);
    } catch { /* empty */ }
    setLoading(false);
  }, [page, catFilter, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.adminGetCategories().then(setCategories).catch(() => {});
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить фото?")) return;
    await api.adminDeletePost(id);
    haptic();
    load();
  };

  const handleCatChange = async (postId: number, newCat: string) => {
    await api.adminUpdatePost(postId, newCat);
    haptic();
    setEditingCat(null);
    load();
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <Layout showTabBar={false} title="Фото" showBack>
      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
        <button
          onClick={() => { haptic(); navigate("/admin"); }}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          <ArrowLeft size={18} color="#A1A1AA" />
          <span style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "#A1A1AA" }}>Админ-панель</span>
        </button>

        {/* Search */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 14px", borderRadius: 12,
          background: "#18181B", border: "1px solid #27272A",
        }}>
          <Search size={16} color="#71717A" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Поиск по промпту..."
            style={{
              flex: 1, background: "none", border: "none", outline: "none",
              fontFamily: "var(--font-body)", fontSize: 14, color: "#FAFAFA",
            }}
          />
        </div>

        {/* Category filter */}
        <select
          value={catFilter}
          onChange={(e) => { setCatFilter(e.target.value); setPage(1); }}
          style={{
            padding: "10px 14px", borderRadius: 12,
            background: "#18181B", border: "1px solid #27272A",
            fontFamily: "var(--font-body)", fontSize: 14, color: "#FAFAFA",
            cursor: "pointer",
          }}
        >
          <option value="">Все категории</option>
          {categories.map((c) => (
            <option key={c.id} value={c.name}>{c.emoji} {c.name} ({c.post_count})</option>
          ))}
        </select>

        <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#71717A" }}>
          Всего: {total}
        </span>

        {/* Posts list */}
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
            <div style={{
              width: 28, height: 28, border: "3px solid #27272A",
              borderTopColor: "#C4F82A", borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }} />
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {posts.map((post) => (
              <div key={post.id} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 14px", borderRadius: 12,
                background: "#18181B", border: "1px solid #27272A",
              }}>
                {/* Thumbnail */}
                {post.has_result_image ? (
                  <img
                    src={api.getResultThumbUrl(post.id)}
                    alt=""
                    style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover" }}
                  />
                ) : (
                  <div style={{
                    width: 48, height: 48, borderRadius: 8,
                    background: "#27272A", display: "flex",
                    alignItems: "center", justifyContent: "center",
                  }}>
                    <span style={{ fontSize: 12, color: "#52525B" }}>N/A</span>
                  </div>
                )}

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: "var(--font-mono)", fontSize: 12, color: "#A1A1AA",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {post.prompt ? post.prompt.slice(0, 60) : `#${post.id}`}
                  </div>

                  {/* Category selector */}
                  {editingCat === post.id ? (
                    <select
                      defaultValue={post.model_name || ""}
                      onChange={(e) => handleCatChange(post.id, e.target.value)}
                      onBlur={() => setEditingCat(null)}
                      autoFocus
                      style={{
                        marginTop: 4, padding: "4px 8px", borderRadius: 6,
                        background: "#0A0A0A", border: "1px solid #3F3F46",
                        fontFamily: "var(--font-body)", fontSize: 12, color: "#FAFAFA",
                      }}
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  ) : (
                    <button
                      onClick={() => setEditingCat(post.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 4, marginTop: 4,
                        background: "none", border: "none", cursor: "pointer", padding: 0,
                      }}
                    >
                      <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "#60A5FA" }}>
                        {post.model_name || "—"}
                      </span>
                      <ChevronDown size={12} color="#60A5FA" />
                    </button>
                  )}
                </div>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(post.id)}
                  style={{
                    display: "flex", padding: 8, background: "none",
                    border: "none", cursor: "pointer",
                  }}
                >
                  <Trash2 size={16} color="#EF4444" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 8, paddingTop: 8 }}>
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              style={{
                padding: "8px 16px", borderRadius: 10,
                background: page <= 1 ? "#18181B" : "#27272A",
                border: "none", cursor: page <= 1 ? "default" : "pointer",
                fontFamily: "var(--font-body)", fontSize: 13, color: page <= 1 ? "#52525B" : "#FAFAFA",
              }}
            >
              Назад
            </button>
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: 13, color: "#A1A1AA",
              display: "flex", alignItems: "center",
            }}>
              {page}/{totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              style={{
                padding: "8px 16px", borderRadius: 10,
                background: page >= totalPages ? "#18181B" : "#27272A",
                border: "none", cursor: page >= totalPages ? "default" : "pointer",
                fontFamily: "var(--font-body)", fontSize: 13, color: page >= totalPages ? "#52525B" : "#FAFAFA",
              }}
            >
              Далее
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
