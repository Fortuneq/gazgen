import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { useIsDesktop } from "../hooks/useMediaQuery";
import { haptic, getUser } from "../telegram";
import { api } from "../api";
import type { UserGeneration } from "../types";
import { Coins, Sparkles, LogOut, X } from "lucide-react";

const MODEL_NAMES: Record<string, string> = {
  nano_banana: "Nano Banana",
  banana: "Nano Banana Pro",
  seedream: "Seedream 4.5",
  seedream_v4: "Seedream V4",
  gpt_text: "GPT Image",
  gpt_img2img: "GPT Img2Img",
  gpt4o: "GPT-4o",
  qwen: "Qwen",
  grok: "Grok Imagine",
};

export default function ProfilePage() {
  const isDesktop = useIsDesktop();
  const navigate = useNavigate();
  const user = getUser();
  const [photoCredits, setPhotoCredits] = useState(0);
  const [generations, setGenerations] = useState<UserGeneration[]>([]);
  const [loadingGens, setLoadingGens] = useState(true);
  const [selected, setSelected] = useState<UserGeneration | null>(null);

  useEffect(() => {
    api.getProfile().then((p) => {
      setPhotoCredits(p.photo_credits);
    }).catch(() => {});
    api.getMyGenerations(1, 50).then((data) => {
      setGenerations(data.items);
    }).catch(() => {}).finally(() => setLoadingGens(false));
  }, []);

  const initials = user
    ? (user.first_name?.[0] ?? "") + (user.last_name?.[0] ?? "")
    : "?";
  const displayName = user?.first_name ?? "Пользователь";
  const handle = user?.username ? `@${user.username}` : "";

  const isBrowser = !window.Telegram?.WebApp?.initData;
  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    window.location.reload();
  };

  const emptyState = (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: isDesktop ? 24 : 20,
      padding: isDesktop ? "64px 40px" : "48px 20px",
      flex: 1,
    }}>
      <Sparkles size={isDesktop ? 48 : 40} color="#27272A" />
      <span style={{
        fontFamily: "var(--font-primary)",
        fontSize: isDesktop ? 20 : 17, fontWeight: 700,
        color: "var(--text-secondary)", textAlign: "center",
      }}>
        Здесь будут ваши работы
      </span>
      <button
        onClick={() => { haptic(); navigate("/create"); }}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          padding: isDesktop ? "14px 32px" : "14px 28px",
          borderRadius: 14, background: "#C4F82A",
          border: "none", cursor: "pointer",
        }}
      >
        <Sparkles size={18} color="#0A0A0A" />
        <span style={{
          fontFamily: "var(--font-primary)",
          fontSize: isDesktop ? 15 : 14, fontWeight: 700, color: "#0A0A0A",
        }}>
          Создадим что-то великое
        </span>
      </button>
    </div>
  );

  const galleryGrid = (
    <div style={{
      display: "grid",
      gridTemplateColumns: isDesktop ? "repeat(3, 1fr)" : "repeat(2, 1fr)",
      gap: isDesktop ? 16 : 10,
      padding: isDesktop ? "0" : "0 20px 20px",
    }}>
      {generations.map((gen) => (
        <button
          key={gen.id}
          onClick={() => { haptic(); setSelected(gen); }}
          style={{
            aspectRatio: "1", borderRadius: isDesktop ? 14 : 12,
            overflow: "hidden", border: "1px solid #27272A",
            background: "#18181B", padding: 0, cursor: "pointer",
            position: "relative",
          }}
        >
          {gen.result_url ? (
            <img
              src={gen.result_url}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              loading="lazy"
            />
          ) : (
            <div style={{
              width: "100%", height: "100%",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Sparkles size={24} color="#27272A" />
            </div>
          )}
        </button>
      ))}
    </div>
  );

  const detailModal = selected ? (
    <div
      onClick={() => setSelected(null)}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.8)", display: "flex",
        alignItems: "center", justifyContent: "center",
        padding: isDesktop ? 40 : 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: isDesktop ? 520 : "100%",
          maxHeight: "90vh", overflowY: "auto",
          borderRadius: 20, background: "#18181B",
          border: "1px solid #27272A",
          display: "flex", flexDirection: "column",
        }}
      >
        {/* Close */}
        <div style={{
          display: "flex", justifyContent: "flex-end", padding: "12px 16px 0",
        }}>
          <button onClick={() => setSelected(null)} style={{
            display: "flex", padding: 4, background: "none", border: "none", cursor: "pointer",
          }}>
            <X size={20} color="#A1A1AA" />
          </button>
        </div>

        {/* Image */}
        {selected.result_url && (
          <div style={{
            margin: "0 16px", borderRadius: 14, overflow: "hidden",
            border: "1px solid #27272A",
          }}>
            <img
              src={selected.result_url}
              alt=""
              style={{ width: "100%", display: "block" }}
            />
          </div>
        )}

        {/* Info */}
        <div style={{
          padding: 16, display: "flex", flexDirection: "column", gap: 10,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#A1A1AA" }}>Модель</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "#FFFFFF" }}>
              {MODEL_NAMES[selected.model] || selected.model}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#A1A1AA" }}>Формат</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "#FFFFFF" }}>
              {selected.aspect_ratio || "1:1"}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#A1A1AA" }}>Стоимость</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "#FFFFFF" }}>
              {selected.cost} ткн
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#A1A1AA" }}>Дата</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "#FFFFFF" }}>
              {new Date(selected.created_at).toLocaleDateString("ru-RU")}
            </span>
          </div>
          {selected.prompt && (
            <div style={{ marginTop: 4 }}>
              <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "#52525B" }}>Промпт</span>
              <p style={{
                fontFamily: "var(--font-body)", fontSize: 13, color: "#A1A1AA",
                lineHeight: 1.5, margin: "4px 0 0",
              }}>
                {selected.prompt}
              </p>
            </div>
          )}
          {selected.reference_urls && selected.reference_urls.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "#52525B" }}>Референсы</span>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                {selected.reference_urls.map((url, i) => (
                  <div key={i} style={{
                    width: 64, height: 64, borderRadius: 10, overflow: "hidden",
                    border: "1px solid #27272A",
                  }}>
                    <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  ) : null;

  const gallerySection = loadingGens ? (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "48px 0",
    }}>
      <div style={{
        width: 32, height: 32, border: "3px solid #27272A",
        borderTopColor: "#C4F82A", borderRadius: "50%",
        animation: "spin 1s linear infinite",
      }} />
    </div>
  ) : generations.length > 0 ? galleryGrid : emptyState;

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
            <button onClick={() => navigate("/subscription")}
              style={{
                padding: "10px 20px", borderRadius: 12,
                background: "var(--accent)", border: "none", cursor: "pointer",
              }}>
              <span style={{ fontFamily: "var(--font-primary)", fontSize: 13, fontWeight: 700, color: "#0A0A0A" }}>Купить ещё</span>
            </button>
          </div>

          {isBrowser && (
            <button onClick={handleLogout} style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "12px 24px", borderRadius: 12, width: "fit-content",
              background: "transparent", border: "1px solid #27272A", cursor: "pointer",
            }}>
              <LogOut size={16} color="#EF4444" />
              <span style={{ fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 600, color: "#EF4444" }}>Выйти</span>
            </button>
          )}

          {/* Gallery title */}
          {generations.length > 0 && (
            <span style={{ fontFamily: "var(--font-primary)", fontSize: 18, fontWeight: 700, color: "var(--text)" }}>
              Мои работы
            </span>
          )}

          {gallerySection}
        </div>
        {detailModal}
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
          <button onClick={() => navigate("/subscription")}
            style={{
              padding: "8px 14px", borderRadius: 10,
              background: "var(--accent)", border: "none", cursor: "pointer",
            }}>
            <span style={{ fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 700, color: "#0A0A0A" }}>Купить</span>
          </button>
        </div>

        {isBrowser && (
          <button onClick={handleLogout} style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "12px 0", borderRadius: 12, width: "100%",
            background: "transparent", border: "1px solid #27272A", cursor: "pointer",
          }}>
            <LogOut size={16} color="#EF4444" />
            <span style={{ fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 600, color: "#EF4444" }}>Выйти</span>
          </button>
        )}
      </div>

      {/* Gallery title */}
      {generations.length > 0 && (
        <div style={{ padding: "8px 20px 0" }}>
          <span style={{ fontFamily: "var(--font-primary)", fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
            Мои работы
          </span>
        </div>
      )}

      <div style={{ padding: "12px 0" }}>
        {gallerySection}
      </div>

      {detailModal}
    </Layout>
  );
}
