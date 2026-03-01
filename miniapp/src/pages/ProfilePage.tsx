import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { useIsDesktop } from "../hooks/useMediaQuery";
import { haptic, getUser } from "../telegram";
import { api } from "../api";
import { Coins, Timer, X } from "lucide-react";

type ProfileFilter = "all" | "photo" | "video" | "favorites";

const FILTERS: { label: string; value: ProfileFilter }[] = [
  { label: "Все", value: "all" },
  { label: "Фото", value: "photo" },
  { label: "Видео", value: "video" },
  { label: "Избранное", value: "favorites" },
];

const MOCK_GALLERY = [
  { id: 1, h: 160 }, { id: 2, h: 200 },
  { id: 3, h: 200 }, { id: 4, h: 160 },
];

export default function ProfilePage() {
  const isDesktop = useIsDesktop();
  const navigate = useNavigate();
  const user = getUser();
  const [filter, setFilter] = useState<ProfileFilter>("all");
  const [showWarning, setShowWarning] = useState(true);
  const [photoCredits, setPhotoCredits] = useState(0);

  useEffect(() => {
    api.getProfile().then((p) => {
      setPhotoCredits(p.photo_credits);
    }).catch(() => {});
  }, []);

  const initials = user
    ? (user.first_name?.[0] ?? "") + (user.last_name?.[0] ?? "")
    : "НГ";
  const displayName = user?.first_name ?? "Никита";
  const handle = user?.username ? `@${user.username}` : "@nikita_design";

  const filterRow = (
    <div style={{ display: "flex", gap: 8 }}>
      {FILTERS.map((f) => {
        const active = filter === f.value;
        return (
          <button key={f.value} onClick={() => { haptic(); setFilter(f.value); }}
            style={{
              padding: isDesktop ? "8px 18px" : "8px 16px", borderRadius: 100,
              background: active ? "var(--accent)" : "var(--surface)",
              border: active ? "none" : "1px solid var(--border)",
            }}>
            <span style={{
              fontFamily: active ? (isDesktop ? "var(--font-primary)" : "var(--font-body)") : "var(--font-body)",
              fontSize: 13, fontWeight: active ? (isDesktop ? 700 : 600) : 500,
              color: active ? "#0A0A0A" : "var(--text-secondary)",
            }}>{f.label}</span>
          </button>
        );
      })}
    </div>
  );

  const storageWarning = showWarning ? (
    <div style={{
      display: "flex", alignItems: "center", gap: isDesktop ? 10 : 8,
      padding: isDesktop ? "12px 16px" : "10px 14px", borderRadius: 12,
      background: "var(--surface)", border: "1px solid var(--border)", width: "100%",
    }}>
      {!isDesktop && (
        <div style={{ width: 3, height: 28, borderRadius: 2, background: "#F59E0B", flexShrink: 0 }} />
      )}
      <Timer size={isDesktop ? 18 : 16} color="#F59E0B" style={{ flexShrink: 0 }} />
      <span style={{ fontFamily: "var(--font-body)", fontSize: isDesktop ? 13 : 12, fontWeight: 500, color: "var(--text-secondary)", flex: 1 }}>
        {isDesktop ? "Контент хранится 10 дней — скачайте, чтобы не потерять" : "Фото и видео хранятся 10 дней"}
      </span>
      {!isDesktop && (
        <button onClick={() => setShowWarning(false)} style={{ padding: 0, flexShrink: 0 }}>
          <X size={14} color="#52525B" />
        </button>
      )}
    </div>
  ) : null;

  // DESKTOP
  if (isDesktop) {
    return (
      <Layout showTabBar={false}>
        <div style={{ padding: "32px 80px", display: "flex", flexDirection: "column", gap: 32 }}>
          {/* Profile header */}
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div style={{
              width: 80, height: 80, borderRadius: 100,
              background: "var(--surface)", border: "2px solid var(--accent)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontFamily: "var(--font-primary)", fontSize: 28, fontWeight: 700, color: "var(--accent)" }}>{initials}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontFamily: "var(--font-primary)", fontSize: 24, fontWeight: 700, color: "var(--text)" }}>{displayName}</span>
              <span style={{ fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 500, color: "var(--text-muted)" }}>{handle}</span>
            </div>
          </div>

          {/* Balance card */}
          <div style={{
            display: "flex", alignItems: "center", gap: 24,
            padding: "16px 24px", borderRadius: 16,
            background: "var(--surface)", border: "1px solid var(--border)",
          }}>
            <span style={{ fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 500, color: "var(--text-muted)" }}>Баланс:</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Coins size={18} color="var(--accent)" />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{photoCredits} токенов</span>
            </div>
            <button onClick={() => navigate("/pricing")}
              style={{
                padding: "10px 20px", borderRadius: 12,
                background: "var(--accent)", border: "none", cursor: "pointer",
              }}>
              <span style={{ fontFamily: "var(--font-primary)", fontSize: 13, fontWeight: 700, color: "#0A0A0A" }}>Купить ещё</span>
            </button>
          </div>

          {/* Filter & warning */}
          {filterRow}
          {storageWarning}

          {/* Gallery grid */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} style={{
                width: 240, height: 240, borderRadius: 16,
                background: "var(--surface)", border: "1px solid var(--border)",
                position: "relative", overflow: "hidden",
              }}>
                <button
                  onClick={() => { haptic(); navigate("/create"); }}
                  style={{
                    position: "absolute", bottom: 10, left: 10, right: 10,
                    padding: "8px 0", borderRadius: 10,
                    background: "#C4F82A", border: "none", cursor: "pointer",
                  }}
                >
                  <span style={{ fontFamily: "var(--font-primary)", fontSize: 13, fontWeight: 700, color: "#0A0A0A" }}>
                    Создать
                  </span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  // MOBILE
  return (
    <Layout showTabBar>
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "16px 20px", gap: 16,
      }}>
        {/* Avatar */}
        <div style={{
          width: 72, height: 72, borderRadius: 36,
          background: "var(--surface)", border: "2px solid var(--accent)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontFamily: "var(--font-primary)", fontSize: 24, fontWeight: 700, color: "var(--accent)" }}>{initials}</span>
        </div>
        <span style={{ fontFamily: "var(--font-primary)", fontSize: 20, fontWeight: 700, color: "var(--text)" }}>{displayName}</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "#52525B" }}>{handle}</span>

        {/* Balance row */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 20px", borderRadius: 16, width: "100%",
          background: "var(--surface)", border: "1px solid var(--border)",
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 500, color: "#52525B" }}>Баланс</span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Coins size={14} color="var(--accent)" />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 500, color: "var(--text)" }}>{photoCredits} токенов</span>
            </div>
          </div>
          <button onClick={() => navigate("/pricing")}
            style={{
              padding: "8px 14px", borderRadius: 10,
              background: "var(--accent)", border: "none", cursor: "pointer",
            }}>
            <span style={{ fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 700, color: "#0A0A0A" }}>Купить</span>
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ padding: "0 20px 12px", overflowX: "auto", scrollbarWidth: "none" }}>
        <div style={{ display: "flex", gap: 8 }}>
          {filterRow}
        </div>
      </div>

      {/* Storage warning */}
      {showWarning && (
        <div style={{ padding: "0 20px", height: 59 }}>
          {storageWarning}
        </div>
      )}

      {/* Gallery grid - masonry style */}
      <div style={{ display: "flex", gap: 8, padding: "8px 20px", flex: 1 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
          {MOCK_GALLERY.filter((_, i) => i % 2 === 0).map((item, idx) => (
            <div key={item.id} style={{
              width: "100%", height: item.h, borderRadius: 12,
              background: "var(--surface)", border: "1px solid var(--border)",
              position: "relative", overflow: "hidden",
            }}>
              {idx === 0 && (
                <div style={{
                  position: "absolute", top: 8, left: 8,
                  padding: "3px 8px", borderRadius: 6,
                  background: "rgba(196,248,42,0.15)", border: "1px solid #C4F82A",
                }}>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 10, fontWeight: 600, color: "#C4F82A" }}>
                    Избранное
                  </span>
                </div>
              )}
              <button
                onClick={() => { haptic(); navigate("/create"); }}
                style={{
                  position: "absolute", bottom: 8, left: 8, right: 8,
                  padding: "7px 0", borderRadius: 8,
                  background: "#C4F82A", border: "none", cursor: "pointer",
                }}
              >
                <span style={{ fontFamily: "var(--font-primary)", fontSize: 12, fontWeight: 700, color: "#0A0A0A" }}>
                  Создать
                </span>
              </button>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
          {MOCK_GALLERY.filter((_, i) => i % 2 === 1).map((item) => (
            <div key={item.id} style={{
              width: "100%", height: item.h, borderRadius: 12,
              background: "var(--surface)", border: "1px solid var(--border)",
              position: "relative", overflow: "hidden",
            }}>
              <button
                onClick={() => { haptic(); navigate("/create"); }}
                style={{
                  position: "absolute", bottom: 8, left: 8, right: 8,
                  padding: "7px 0", borderRadius: 8,
                  background: "#C4F82A", border: "none", cursor: "pointer",
                }}
              >
                <span style={{ fontFamily: "var(--font-primary)", fontSize: 12, fontWeight: 700, color: "#0A0A0A" }}>
                  Создать
                </span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
