import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../../components/Layout";
import { api } from "../../api";
import type { AdminTag } from "../../types";
import { ArrowLeft, Plus, Trash2, Pencil, Check, X, Eye, EyeOff, GripVertical } from "lucide-react";
import { haptic } from "../../telegram";

export default function AdminTagsPage() {
  const navigate = useNavigate();
  const [tags, setTags] = useState<AdminTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDisplay, setNewDisplay] = useState("");
  const [newEmoji, setNewEmoji] = useState("");
  const [editing, setEditing] = useState<{
    id: number; name: string; display_name: string; emoji: string; sort_order: number;
  } | null>(null);

  const load = async () => {
    setLoading(true);
    try { setTags(await api.adminGetTags()); } catch { /* empty */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!newName.trim() || !newDisplay.trim()) return;
    await api.adminCreateTag(newName.trim(), newDisplay.trim(), newEmoji.trim());
    haptic();
    setNewName(""); setNewDisplay(""); setNewEmoji(""); setShowAdd(false);
    load();
  };

  const handleUpdate = async () => {
    if (!editing) return;
    await api.adminUpdateTag(editing.id, {
      name: editing.name, display_name: editing.display_name,
      emoji: editing.emoji, sort_order: editing.sort_order,
    });
    haptic();
    setEditing(null);
    load();
  };

  const handleToggleHidden = async (tag: AdminTag) => {
    await api.adminUpdateTag(tag.id, { hidden: !tag.hidden });
    haptic();
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить тег?")) return;
    await api.adminDeleteTag(id);
    haptic();
    load();
  };

  return (
    <Layout showTabBar={false} title="Теги (Примеры)" showBack>
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
            {showAdd ? "Отмена" : "Добавить тег"}
          </span>
        </button>

        {/* Add form */}
        {showAdd && (
          <div style={{
            display: "flex", flexDirection: "column", gap: 8,
            padding: "12px 14px", borderRadius: 12,
            background: "#18181B", border: "1px solid #27272A",
          }}>
            <div style={{ display: "flex", gap: 8 }}>
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
                placeholder="slug (portrait)"
                style={{
                  flex: 1, padding: "8px 12px", borderRadius: 8,
                  background: "#0A0A0A", border: "1px solid #3F3F46",
                  fontFamily: "var(--font-mono)", fontSize: 14, color: "#FAFAFA",
                }}
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={newDisplay}
                onChange={(e) => setNewDisplay(e.target.value)}
                placeholder="Отображаемое имя"
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
          </div>
        )}

        {/* Tags list */}
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
            {tags.map((tag) => (
              <div key={tag.id} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "12px 14px", borderRadius: 12,
                background: "#18181B", border: "1px solid #27272A",
                opacity: tag.hidden ? 0.5 : 1,
              }}>
                {editing?.id === tag.id ? (
                  <>
                    <input
                      value={editing.emoji}
                      onChange={(e) => setEditing({ ...editing, emoji: e.target.value })}
                      style={{
                        width: 36, padding: "4px", borderRadius: 6,
                        background: "#0A0A0A", border: "1px solid #3F3F46",
                        fontSize: 14, color: "#FAFAFA", textAlign: "center",
                      }}
                    />
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                      <input
                        value={editing.name}
                        onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                        style={{
                          padding: "4px 8px", borderRadius: 6,
                          background: "#0A0A0A", border: "1px solid #3F3F46",
                          fontFamily: "var(--font-mono)", fontSize: 12, color: "#A1A1AA",
                        }}
                      />
                      <input
                        value={editing.display_name}
                        onChange={(e) => setEditing({ ...editing, display_name: e.target.value })}
                        style={{
                          padding: "4px 8px", borderRadius: 6,
                          background: "#0A0A0A", border: "1px solid #3F3F46",
                          fontFamily: "var(--font-body)", fontSize: 14, color: "#FAFAFA",
                        }}
                      />
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "#71717A" }}>Порядок:</span>
                        <input
                          type="number"
                          value={editing.sort_order}
                          onChange={(e) => setEditing({ ...editing, sort_order: parseInt(e.target.value) || 0 })}
                          style={{
                            width: 50, padding: "2px 6px", borderRadius: 4,
                            background: "#0A0A0A", border: "1px solid #3F3F46",
                            fontFamily: "var(--font-mono)", fontSize: 12, color: "#FAFAFA",
                            textAlign: "center",
                          }}
                        />
                      </div>
                    </div>
                    <button onClick={handleUpdate} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                      <Check size={16} color="#C4F82A" />
                    </button>
                    <button onClick={() => setEditing(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                      <X size={16} color="#A1A1AA" />
                    </button>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: 20, width: 28, textAlign: "center" }}>{tag.emoji || "📁"}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontFamily: "var(--font-primary)", fontSize: 15, fontWeight: 600, color: "#FAFAFA" }}>
                          {tag.display_name}
                        </span>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#52525B" }}>
                          {tag.name}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#71717A" }}>
                          {tag.post_count} фото
                        </span>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#3F3F46" }}>
                          #{tag.sort_order}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleHidden(tag)}
                      title={tag.hidden ? "Показать" : "Скрыть"}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}
                    >
                      {tag.hidden ? <EyeOff size={14} color="#71717A" /> : <Eye size={14} color="#A1A1AA" />}
                    </button>
                    <button
                      onClick={() => { haptic(); setEditing({ id: tag.id, name: tag.name, display_name: tag.display_name, emoji: tag.emoji, sort_order: tag.sort_order }); }}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}
                    >
                      <Pencil size={14} color="#A1A1AA" />
                    </button>
                    <button
                      onClick={() => handleDelete(tag.id)}
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
