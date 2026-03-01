import { Navigate } from "react-router-dom";
import { useState } from "react";
import { Layout } from "../components/Layout";
import { useIsDesktop } from "../hooks/useMediaQuery";
import { haptic } from "../telegram";
import { Image, Video } from "lucide-react";

const MODEL_TABS = [
  "Nano Banana", "Nano Banana PRO", "Sora", "FLUX", "Stable Diffusion", "Imagen 4", "Seedream",
];

const PHOTO_PACKS = [
  { count: 10, price: "149 ₽", per: "14.9 ₽ / фото", best: false },
  { count: 100, price: "990 ₽", per: "9.9 ₽ / фото", best: true },
];

const VIDEO_PACKS = [
  { count: 1, price: "99 ₽", discount: null, best: false },
  { count: 5, price: "399 ₽", discount: "-20%", best: true },
  { count: 10, price: "699 ₽", discount: null, best: false },
];

export default function PricingPage() {
  const isDesktop = useIsDesktop();
  const [activeModel, setActiveModel] = useState("Nano Banana");

  // MOBILE
  if (!isDesktop) {
    return (
      <Layout title="Пакеты" showBack showTabBar={false}>
        {/* Subtitle */}
        <div style={{ padding: "4px 20px", display: "flex", justifyContent: "center" }}>
          <span style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 500, color: "#52525B", textAlign: "center" }}>
            Цена зависит от выбранной модели
          </span>
        </div>

        {/* Model tabs */}
        <div style={{
          display: "flex", gap: 8, padding: "12px 20px",
          overflowX: "auto", scrollbarWidth: "none",
        }}>
          {MODEL_TABS.map((tab) => {
            const active = activeModel === tab;
            return (
              <button key={tab} onClick={() => { haptic(); setActiveModel(tab); }}
                style={{
                  padding: "8px 16px", borderRadius: 100, whiteSpace: "nowrap", flexShrink: 0,
                  background: active ? "var(--accent)" : "var(--surface)",
                  border: active ? "none" : "1px solid var(--border)",
                }}>
                <span style={{
                  fontFamily: "var(--font-body)", fontSize: 13,
                  fontWeight: active ? 600 : 500,
                  color: active ? "#0A0A0A" : "var(--text-secondary)",
                }}>{tab}</span>
              </button>
            );
          })}
        </div>

        {/* Photo packages */}
        <div style={{ padding: "16px 20px 0", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Image size={18} color="var(--accent)" />
            <span style={{ fontFamily: "var(--font-primary)", fontSize: 16, fontWeight: 700, color: "var(--text)" }}>Фото</span>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            {PHOTO_PACKS.map((pack) => (
              <div key={pack.count} style={{
                flex: 1, padding: 16, borderRadius: 16,
                background: "var(--surface)",
                border: pack.best ? "2px solid var(--accent)" : "1px solid var(--border)",
                display: "flex", flexDirection: "column", gap: 8,
              }}>
                {pack.best && (
                  <div style={{
                    alignSelf: "flex-start", padding: "3px 8px", borderRadius: 100,
                    background: "var(--accent)",
                  }}>
                    <span style={{ fontFamily: "var(--font-body)", fontSize: 10, fontWeight: 700, color: "#0A0A0A" }}>Выгодно</span>
                  </div>
                )}
                <span style={{ fontFamily: "var(--font-primary)", fontSize: 36, fontWeight: 800, color: "var(--text)" }}>{pack.count}</span>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)" }}>фото</span>
                <span style={{ fontFamily: "var(--font-primary)", fontSize: 18, fontWeight: 700, color: "var(--text)" }}>{pack.price}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#52525B" }}>{pack.per}</span>
                <button style={{
                  height: 36, borderRadius: 10, width: "100%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: pack.best ? "var(--accent)" : "transparent",
                  border: pack.best ? "none" : "1px solid var(--border)",
                }}>
                  <span style={{
                    fontFamily: "var(--font-body)", fontSize: 13,
                    fontWeight: pack.best ? 700 : 600,
                    color: pack.best ? "#0A0A0A" : "var(--text-secondary)",
                  }}>Купить</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Video packages */}
        <div style={{ padding: "12px 20px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Video size={18} color="var(--accent)" />
            <span style={{ fontFamily: "var(--font-primary)", fontSize: 16, fontWeight: 700, color: "var(--text)" }}>Видео</span>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {VIDEO_PACKS.map((pack) => (
              <div key={pack.count} style={{
                flex: 1, padding: "12px 10px", borderRadius: 16,
                background: "var(--surface)",
                border: pack.best ? "2px solid var(--accent)" : "1px solid var(--border)",
                display: "flex", flexDirection: "column", alignItems: pack.best ? "center" : "flex-start", gap: 6,
              }}>
                {pack.discount && (
                  <div style={{
                    padding: "2px 8px", borderRadius: 100, background: "var(--accent)",
                  }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, color: "#0A0A0A" }}>{pack.discount}</span>
                  </div>
                )}
                <span style={{ fontFamily: "var(--font-primary)", fontSize: 24, fontWeight: 800, color: "var(--text)" }}>{pack.count}</span>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 500, color: "var(--text-secondary)" }}>видео</span>
                <span style={{ fontFamily: "var(--font-primary)", fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{pack.price}</span>
                <button style={{
                  height: 32, borderRadius: 8, width: "100%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: pack.best ? "var(--accent)" : "transparent",
                  border: pack.best ? "none" : "1px solid var(--border)",
                }}>
                  <span style={{
                    fontFamily: "var(--font-body)", fontSize: 12,
                    fontWeight: pack.best ? 700 : 600,
                    color: pack.best ? "#0A0A0A" : "var(--text-secondary)",
                  }}>Купить</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Note */}
        <div style={{ display: "flex", justifyContent: "center", padding: "8px 20px" }}>
          <span style={{
            fontFamily: "var(--font-body)", fontSize: 11, color: "#52525B",
            textAlign: "center", maxWidth: 300,
          }}>
            Цены указаны для Nano Banana. Переключи модель для актуальных цен.
          </span>
        </div>
      </Layout>
    );
  }

  // DESKTOP - show subscription page with full pricing
  return <Navigate to="/subscription" replace />;
}
