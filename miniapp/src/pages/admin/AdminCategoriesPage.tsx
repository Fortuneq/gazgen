import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../../components/Layout";
import { api } from "../../api";
import type { AdminCategory } from "../../types";
import { ArrowLeft, Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { haptic } from "../../telegram";

export default function AdminCategoriesPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<{ id: number; name: string; emoji: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.adminGetCategories();
      setCategories(data);
    } catch { /* empty */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await api.adminCreateCategory(newName.trim(), newEmoji.trim());
    haptic();
    setNewName(""); setNewEmoji(""); setShowAdd(false);
    load();
  };

  const handleUpdate = async () => {
    if (!editing) return;
    await api.adminUpdateCategory(editing.id, { name: editing.name, emoji: editing.emoji });
    haptic();
    setEditing(null);
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить категорию?")) return;
    await api.adminDeleteCategory(id);
    haptic();
    load();
  };

  return (
    <Layout showTabBar={false} title="Категории" showBack>
      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
        <button
          onClick={() => { haptic(); navigate("/admin"); }}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          <ArrowLeft size={18} color="#A1A1AA" />
          <span style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "#A1A1AA" }}>Админ-панель</span>
        </button>

        {/* Add button */}
        <button
          onClick={() => { haptic(); setShowAdd(!showAdd); }}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "12px 0", borderRadius: 12,
            background: showAdd ? "#27272A" : "#C4F82A",
            border: "none", cursor: "pointer",
          }}
        >
          <Plus size={16} color={showAdd ? "#FAFAFA" : "#0A0A0A"} />
          <span style={{
            fontFamily: "var(--font-primary)", fontSize: 14, fontWeight: 700,
            color: showAdd ? "#FAFAFA" : "#0A0A0A",
          }}>
            {showAdd ? "Отмена" : "Добавить"}
          </span>
        </button>

        {/* Add form */}
        {showAdd && (
          <div style={{
            display: "flex", gap: 8,
            padding: "12px 14px", borderRadius: 12,
            background: "#18181B", border: "1px solid #27272A",
          }}>
            <input
              value={newEmoji}
              onChange={(e) => setNewEmoji(e.target.value)}
              placeholder="Emoji"
              style={{
                width: 50, padding: "8px", borderRadius: 8,
                background: "#0A0A0A", border: "1px solid #3F3F46",
                fontFamily: "var(--font-body)", fontSize: 14, color: "#FAFAFA",
                textAlign: "center",
              }}
            />
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Название категории"
              style={{
                flex: 1, padding: "8px 12px", borderRadius: 8,
                background: "#0A0A0A", border: "1px solid #3F3F46",
                fontFamily: "var(--font-body)", fontSize: 14, color: "#FAFAFA",
              }}
            />
            <button
              onClick={handleCreate}
              style={{
                padding: "8px 14px", borderRadius: 8,
                background: "#C4F82A", border: "none", cursor: "pointer",
              }}
            >
              <Check size={16} color="#0A0A0A" />
            </button>
          </div>
        )}

        {/* Categories list */}
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
            {categories.map((cat) => (
              <div key={cat.id} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 14px", borderRadius: 12,
                background: "#18181B", border: "1px solid #27272A",
              }}>
                {editing?.id === cat.id ? (
                  <>
                    <input
                      value={editing.emoji}
                      onChange={(e) => setEditing({ ...editing, emoji: e.target.value })}
                      style={{
                        width: 40, padding: "6px", borderRadius: 6,
                        background: "#0A0A0A", border: "1px solid #3F3F46",
                        fontFamily: "var(--font-body)", fontSize: 14, color: "#FAFAFA",
                        textAlign: "center",
                      }}
                    />
                    <input
                      value={editing.name}
                      onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                      style={{
                        flex: 1, padding: "6px 10px", borderRadius: 6,
                        background: "#0A0A0A", border: "1px solid #3F3F46",
                        fontFamily: "var(--font-body)", fontSize: 14, color: "#FAFAFA",
                      }}
                    />
                    <button onClick={handleUpdate} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                      <Check size={16} color="#C4F82A" />
                    </button>
                    <button onClick={() => setEditing(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                      <X size={16} color="#A1A1AA" />
                    </button>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: 20, width: 32, textAlign: "center" }}>{cat.emoji || "📁"}</span>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontFamily: "var(--font-primary)", fontSize: 15, fontWeight: 600, color: "#FAFAFA" }}>
                        {cat.name}
                      </span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#71717A", marginLeft: 8 }}>
                        {cat.post_count}
                      </span>
                    </div>
                    <button
                      onClick={() => { haptic(); setEditing({ id: cat.id, name: cat.name, emoji: cat.emoji || "" }); }}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}
                    >
                      <Pencil size={14} color="#A1A1AA" />
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}
                    >
                      <Trash2 size={14} color="#EF4444" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
