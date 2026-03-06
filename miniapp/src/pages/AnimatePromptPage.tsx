import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { useIsDesktop } from "../hooks/useMediaQuery";
import { haptic } from "../telegram";
import { Check, Video, Upload, Clapperboard } from "lucide-react";
import type { AnimeDuration } from "../types";

const DURATIONS: { label: string; value: AnimeDuration; cost: number }[] = [
  { label: "5 сек", value: "5", cost: 30 },
  { label: "10 сек", value: "10", cost: 60 },
];

export default function AnimatePromptPage() {
  const isDesktop = useIsDesktop();
  const location = useLocation();
  const navigate = useNavigate();
  const { preview } = (location.state as { preview?: string }) || {};

  const [prompt, setPrompt] = useState("Девушка поворачивает голову, улыбается и поправляет волосы, лёгкий ветер...");
  const [duration, setDuration] = useState<AnimeDuration>("5");

  const cost = DURATIONS.find((d) => d.value === duration)?.cost ?? 30;

  const handleSubmit = () => {
    haptic("medium");
    navigate("/loading/mock-task-id");
  };

  const photoPreviewWithCheck = (w: number, h: number, radius: number) => (
    <div style={{
      width: "100%", height: h, borderRadius: radius,
      overflow: "hidden", position: "relative",
      background: "var(--surface)", border: "1px solid var(--border)",
    }}>
      {preview ? (
        <img src={preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <div style={{
          width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Upload size={40} color="#52525B" />
        </div>
      )}
      <div style={{
        position: "absolute", bottom: isDesktop ? 16 : 10, right: isDesktop ? 16 : 10,
        width: isDesktop ? 40 : 32, height: isDesktop ? 40 : 32,
        borderRadius: isDesktop ? 20 : 16, background: "var(--accent)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Check size={isDesktop ? 22 : 18} color="#0A0A0A" />
      </div>
    </div>
  );

  const descriptionSection = (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
        <span style={{ fontFamily: "var(--font-primary)", fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
          Описание движения
        </span>
        <div style={{
          padding: "6px 12px", borderRadius: 8,
          background: "var(--surface)", border: "1px solid var(--border)",
        }}>
          <span style={{ fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>
            По умолчанию
          </span>
        </div>
      </div>
      <div style={{
        borderRadius: 14, background: "var(--surface)",
        border: "1px solid var(--border)", padding: "12px 16px",
        height: isDesktop ? 100 : 80,
      }}>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Опишите, как должно двигаться фото..."
          style={{
            width: "100%", height: "100%", resize: "none",
            fontFamily: "var(--font-body)", fontSize: isDesktop ? 14 : 13,
            color: "var(--text-secondary)", lineHeight: 1.5,
            background: "transparent",
          }}
        />
      </div>
    </div>
  );

  const durationSection = (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
      <span style={{
        fontFamily: isDesktop ? "var(--font-body)" : "var(--font-primary)",
        fontSize: isDesktop ? 14 : 16, fontWeight: isDesktop ? 600 : 700,
        color: isDesktop ? "var(--text-secondary)" : "var(--text)",
      }}>
        Длительность
      </span>
      <div style={{ display: "flex", gap: 8, width: "100%" }}>
        {DURATIONS.map((d) => {
          const active = duration === d.value;
          return (
            <button key={d.value} onClick={() => { haptic(); setDuration(d.value); }}
              style={{
                flex: 1, padding: "10px 16px", borderRadius: 12,
                background: active ? "var(--accent)" : "var(--surface)",
                border: active ? "none" : "1px solid var(--border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                gap: 6,
              }}>
              <span style={{
                fontFamily: "var(--font-body)", fontSize: 13,
                fontWeight: active ? 600 : 500,
                color: active ? "#0A0A0A" : "var(--text-secondary)",
              }}>
                {d.label}
              </span>
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: 12,
                fontWeight: 500,
                color: active ? "#0A0A0A" : "var(--text-muted)",
                opacity: active ? 0.7 : 0.6,
              }}>
                {d.cost}💰
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const costRow = (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "12px 16px", borderRadius: 12,
      background: "var(--surface)", border: "1px solid var(--border)", width: "100%",
    }}>
      <span style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)" }}>
        Стоимость
      </span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 500, color: "var(--accent)" }}>
        ⚡ {cost} токенов
      </span>
    </div>
  );

  const ctaButton = (
    <button onClick={handleSubmit}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        width: "100%", height: 52, borderRadius: 16,
        background: "var(--accent)", border: "none", cursor: "pointer",
      }}>
      {isDesktop ? (
        <Clapperboard size={18} color="#0A0A0A" />
      ) : (
        <Video size={20} color="#0A0A0A" />
      )}
      <span style={{
        fontFamily: isDesktop ? "var(--font-body)" : "var(--font-primary)",
        fontSize: isDesktop ? 15 : 16, fontWeight: 700, color: "#0A0A0A",
      }}>
        Оживить — {cost} токенов
      </span>
    </button>
  );

  // DESKTOP
  if (isDesktop) {
    return (
      <Layout showTabBar={false}>
        <div style={{ display: "flex", gap: 40, padding: "32px 40px", flex: 1 }}>
          {/* Settings column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24, width: 480 }}>
            <div style={{
              width: "100%", height: 200, borderRadius: 20,
              background: "var(--surface)", border: "1px solid var(--border)",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 12, cursor: "pointer",
              overflow: "hidden", position: "relative",
            }}>
              {preview ? (
                <img src={preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <>
                  <Upload size={40} color="#52525B" />
                  <span style={{ fontFamily: "var(--font-primary)", fontSize: 18, fontWeight: 700, color: "var(--text)" }}>Загрузи фото</span>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 500, color: "#52525B" }}>JPG, PNG до 10 МБ</span>
                </>
              )}
            </div>
            {descriptionSection}
            {durationSection}
            {costRow}
            {ctaButton}
          </div>
          {/* Preview column */}
          <div style={{ display: "flex", justifyContent: "center", flex: 1 }}>
            {photoPreviewWithCheck(420, 560, 20)}
          </div>
        </div>
      </Layout>
    );
  }

  // MOBILE
  return (
    <Layout title="Оживить фото" showBack showTabBar={false}>
      <div style={{
        display: "flex", flexDirection: "column", gap: 16,
        padding: "16px 20px", flex: 1, overflowY: "auto",
      }}>
        {photoPreviewWithCheck(335, 180, 20)}
        {descriptionSection}
        {durationSection}
        {costRow}
      </div>
      <div style={{ padding: "12px 20px 24px 20px" }}>
        {ctaButton}
      </div>
    </Layout>
  );
}
