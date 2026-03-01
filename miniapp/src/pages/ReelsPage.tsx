import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { useIsDesktop } from "../hooks/useMediaQuery";
import { haptic } from "../telegram";
import { ArrowLeft } from "lucide-react";

const CATEGORIES_MOBILE = ["Все", "Танцы", "Мода", "Спорт", "Юмор"];
const CATEGORIES_DESKTOP = ["Все", "Танцы", "Мода", "Спорт", "Юмор", "Тренды"];

const TEMPLATES = [
  { id: "1", name: "Танец в неоне", category: "dance" },
  { id: "2", name: "Городской ритм", category: "dance" },
  { id: "3", name: "Подиум стиль", category: "fashion" },
  { id: "4", name: "Фитнес энерджи", category: "sport" },
  { id: "5", name: "Спорт мотив", category: "sport" },
  { id: "6", name: "Комедия скетч", category: "humor" },
  { id: "7", name: "Тренд дня", category: "trends" },
  { id: "8", name: "Подиум день", category: "fashion" },
  { id: "9", name: "Баскетбол", category: "sport" },
  { id: "10", name: "Путешествия", category: "trends" },
];

const CATEGORY_MAP: Record<string, string> = {
  "Танцы": "dance",
  "Мода": "fashion",
  "Спорт": "sport",
  "Юмор": "humor",
  "Тренды": "trends",
};

export default function ReelsPage() {
  const isDesktop = useIsDesktop();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("Все");
  const categories = isDesktop ? CATEGORIES_DESKTOP : CATEGORIES_MOBILE;

  const filteredTemplates = activeCategory === "Все"
    ? TEMPLATES
    : TEMPLATES.filter((t) => t.category === CATEGORY_MAP[activeCategory]);

  const handleUseTemplate = (id: string) => {
    haptic();
    navigate(`/reels/${id}`);
  };

  // DESKTOP
  if (isDesktop) {
    return (
      <Layout showTabBar={false}>
        <div style={{ padding: "48px 80px", display: "flex", flexDirection: "column", gap: 32, flex: 1 }}>
          {/* Breadcrumb */}
          <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-muted)" }}>
            Создать &gt; Reels
          </span>

          {/* Title */}
          <span style={{ fontFamily: "var(--font-primary)", fontSize: 36, fontWeight: 700, color: "var(--text)" }}>
            Создать Reels
          </span>

          {/* Filters */}
          <div style={{ display: "flex", gap: 12 }}>
            {categories.map((cat) => {
              const active = activeCategory === cat;
              return (
                <button key={cat} onClick={() => { haptic(); setActiveCategory(cat); }}
                  style={{
                    padding: "10px 20px", borderRadius: 100,
                    background: active ? "#C4F82A" : "#18181B",
                    border: active ? "none" : "1px solid #27272A",
                    cursor: "pointer",
                  }}>
                  <span style={{
                    fontFamily: "var(--font-body)", fontSize: 14,
                    fontWeight: active ? 600 : 500,
                    color: active ? "#0A0A0A" : "var(--text-secondary)",
                  }}>{cat}</span>
                </button>
              );
            })}
          </div>

          {/* Cards grid - 5 columns */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {filteredTemplates.map((t) => (
              <div key={t.id}
                style={{
                  width: "calc(20% - 13px)", borderRadius: 16,
                  background: "var(--surface)", border: "1px solid var(--border)",
                  overflow: "hidden",
                  display: "flex", flexDirection: "column",
                }}>
                {/* Thumbnail */}
                <div style={{ height: 280, background: "#27272A" }} />
                {/* Card bottom */}
                <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: 10 }}>
                  <span style={{ fontFamily: "var(--font-primary)", fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
                    {t.name}
                  </span>
                  <button
                    onClick={() => handleUseTemplate(t.id)}
                    style={{
                      width: "100%", padding: "8px 0", borderRadius: 10,
                      background: "#C4F82A", border: "none", cursor: "pointer",
                    }}
                  >
                    <span style={{ fontFamily: "var(--font-primary)", fontSize: 13, fontWeight: 700, color: "#0A0A0A" }}>
                      Использовать
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  // MOBILE
  return (
    <Layout title="Создать Reels" showBack showTabBar={false} fullScreen>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: 56, padding: "0 20px", flexShrink: 0,
      }}>
        <button onClick={() => navigate(-1)} style={{ display: "flex", padding: 0, background: "none", border: "none", cursor: "pointer" }}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </button>
        <span style={{ fontFamily: "var(--font-primary)", fontSize: 18, fontWeight: 700, color: "#FFFFFF" }}>
          Создать Reels
        </span>
        <div style={{ width: 24 }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        {/* Category filter chips */}
        <div style={{
          display: "flex", gap: 8, padding: "12px 20px",
          overflowX: "auto", scrollbarWidth: "none", alignItems: "center",
        }}>
          {categories.map((cat) => {
            const active = activeCategory === cat;
            return (
              <button key={cat} onClick={() => { haptic(); setActiveCategory(cat); }}
                style={{
                  padding: "0 14px", height: 32, borderRadius: 100,
                  background: active ? "#C4F82A" : "#18181B",
                  border: active ? "none" : "1px solid #27272A",
                  whiteSpace: "nowrap", flexShrink: 0,
                  display: "flex", alignItems: "center", cursor: "pointer",
                }}>
                <span style={{
                  fontFamily: "var(--font-body)", fontSize: 13,
                  fontWeight: active ? 600 : 500,
                  color: active ? "#0A0A0A" : "var(--text-secondary)",
                }}>{cat}</span>
              </button>
            );
          })}
        </div>

        {/* Template grid - 2 column masonry */}
        <div style={{ display: "flex", gap: 12, padding: "8px 20px 20px", flex: 1 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
            {filteredTemplates.filter((_, i) => i % 2 === 0).map((t) => (
              <div key={t.id} style={{
                borderRadius: 16,
                background: "var(--surface)", border: "1px solid var(--border)",
                overflow: "hidden", display: "flex", flexDirection: "column",
              }}>
                <div style={{ height: 180, background: "#27272A" }} />
                <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                  <span style={{ fontFamily: "var(--font-primary)", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                    {t.name}
                  </span>
                  <button
                    onClick={() => handleUseTemplate(t.id)}
                    style={{
                      width: "100%", padding: "7px 0", borderRadius: 8,
                      background: "#C4F82A", border: "none", cursor: "pointer",
                    }}
                  >
                    <span style={{ fontFamily: "var(--font-primary)", fontSize: 12, fontWeight: 700, color: "#0A0A0A" }}>
                      Использовать
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
            {filteredTemplates.filter((_, i) => i % 2 === 1).map((t) => (
              <div key={t.id} style={{
                borderRadius: 16,
                background: "var(--surface)", border: "1px solid var(--border)",
                overflow: "hidden", display: "flex", flexDirection: "column",
              }}>
                <div style={{ height: 180, background: "#27272A" }} />
                <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                  <span style={{ fontFamily: "var(--font-primary)", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                    {t.name}
                  </span>
                  <button
                    onClick={() => handleUseTemplate(t.id)}
                    style={{
                      width: "100%", padding: "7px 0", borderRadius: 8,
                      background: "#C4F82A", border: "none", cursor: "pointer",
                    }}
                  >
                    <span style={{ fontFamily: "var(--font-primary)", fontSize: 12, fontWeight: 700, color: "#0A0A0A" }}>
                      Использовать
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
