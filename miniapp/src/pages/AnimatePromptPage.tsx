import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { useIsDesktop } from "../hooks/useMediaQuery";
import { haptic } from "../telegram";
import { Check, Video, Upload, Info, Clapperboard } from "lucide-react";
import type { AnimeDuration, AnimateModel } from "../types";

const DURATIONS: { label: string; value: AnimeDuration }[] = [
  { label: "3с", value: "3" },
  { label: "5с", value: "5" },
  { label: "10с", value: "10" },
  { label: "15с", value: "15" },
];

const MODELS: { label: string; value: AnimateModel }[] = [
  { label: "Kling 2.6", value: "kling2.6" },
  { label: "Kling 3.0", value: "kling3.0" },
  { label: "Veo", value: "veo" },
];

const COST = 5;

export default function AnimatePromptPage() {
  const isDesktop = useIsDesktop();
  const location = useLocation();
  const navigate = useNavigate();
  const { preview } = (location.state as { preview?: string }) || {};

  const [prompt, setPrompt] = useState("Девушка поворачивает голову, улыбается и поправляет волосы, лёгкий ветер...");
  const [duration, setDuration] = useState<AnimeDuration>("15");
  const [model, setModel] = useState<AnimateModel>("kling2.6");

  const showWarning = parseInt(duration) > 10;

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
          Описание видео
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
          placeholder="Опишите, как должно выглядеть видео..."
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
        <span style={{ fontFamily: "var(--font-primary)", fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
          Длительность
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 600, color: "var(--accent)" }}>
          {duration} сек
        </span>
      </div>
      {/* Slider ticks */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
        <div style={{
          width: "100%", height: 6, background: "var(--border)", borderRadius: 3,
          position: "relative", overflow: "visible",
        }}>
          <div style={{
            width: `${((DURATIONS.findIndex(d => d.value === duration) + 1) / DURATIONS.length) * 100}%`,
            height: 6, background: "var(--accent)", borderRadius: 3,
          }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
          {DURATIONS.map((d) => (
            <button key={d.value} onClick={() => { haptic(); setDuration(d.value); }}
              style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
              <span style={{
                fontFamily: "var(--font-body)", fontSize: 11,
                fontWeight: d.value === duration ? 600 : 500,
                color: d.value === duration ? "var(--accent)" : "var(--text-muted)",
              }}>
                {d.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const warningBanner = showWarning ? (
    <div style={{
      borderRadius: 14, background: "#1C1508",
      border: "1px solid #3D2E0A", padding: "12px 14px",
      display: "flex", flexDirection: "column", gap: 8, width: "100%",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{
          width: 22, height: 22, borderRadius: 11,
          background: "#3D2E0A", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Info size={14} color="#D49300" />
        </div>
        <span style={{ fontFamily: "var(--font-primary)", fontSize: 13, fontWeight: 700, color: "#D49300" }}>
          Долгая генерация
        </span>
      </div>
      <span style={{
        fontFamily: "var(--font-body)", fontSize: 11, color: "#A18A50", lineHeight: 1.5,
      }}>
        Видео более 10 сек генерируются дольше — ожидание может занять до 5–15 минут. Поставьте в очередь и проверьте позже.
      </span>
      <div style={{ display: "flex", gap: 6 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "4px 10px", borderRadius: 8, background: "#2A1F06",
        }}>
          <div style={{ width: 6, height: 6, borderRadius: 3, background: "#D49300" }} />
          <span style={{ fontFamily: "var(--font-body)", fontSize: 10, fontWeight: 600, color: "#D49300" }}>
            Высокая нагрузка
          </span>
        </div>
      </div>
    </div>
  ) : null;

  const modelSectionEl = (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
      <span style={{ fontFamily: "var(--font-primary)", fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
        Модель
      </span>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", width: "100%" }}>
        {MODELS.map((m) => {
          const active = model === m.value;
          return (
            <button key={m.value} onClick={() => { haptic(); setModel(m.value); }}
              style={{
                padding: "8px 14px", borderRadius: 12,
                background: active ? "var(--accent)" : "var(--surface)",
                border: active ? "none" : "1px solid var(--border)",
              }}>
              <span style={{
                fontFamily: "var(--font-body)", fontSize: 13,
                fontWeight: active ? 600 : 500,
                color: active ? "#0A0A0A" : "var(--text-secondary)",
              }}>
                {m.label}
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
        {COST} кредитов
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
      <Video size={20} color="#0A0A0A" />
      <span style={{ fontFamily: "var(--font-primary)", fontSize: 16, fontWeight: 700, color: "#0A0A0A" }}>
        Оживить — {COST} кредитов
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
            {/* Upload area (desktop has separate small upload + description) */}
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
            <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
              <span style={{ fontFamily: "var(--font-primary)", fontSize: 16, fontWeight: 700, color: "var(--text)" }}>Длительность</span>
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
                      }}>
                      <span style={{
                        fontFamily: "var(--font-body)", fontSize: 13,
                        fontWeight: active ? 600 : 500,
                        color: active ? "#0A0A0A" : "var(--text-secondary)",
                      }}>{d.label === "3с" ? "3 сек" : d.label === "5с" ? "5 сек" : d.label === "10с" ? "10 сек" : "15 сек"}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
              <span style={{ fontFamily: "var(--font-primary)", fontSize: 16, fontWeight: 700, color: "var(--text)" }}>Модель</span>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {MODELS.map((m) => {
                  const active = model === m.value;
                  return (
                    <button key={m.value} onClick={() => { haptic(); setModel(m.value); }}
                      style={{
                        padding: "8px 14px", borderRadius: 12,
                        background: active ? "var(--accent)" : "var(--surface)",
                        border: active ? "none" : "1px solid var(--border)",
                      }}>
                      <span style={{
                        fontFamily: "var(--font-body)", fontSize: 13,
                        fontWeight: active ? 600 : 500,
                        color: active ? "#0A0A0A" : "var(--text-secondary)",
                      }}>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 16px", borderRadius: 12,
              background: "var(--surface)", border: "1px solid var(--border)", width: "100%",
            }}>
              <span style={{ fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 500, color: "var(--text-secondary)" }}>Стоимость</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 500, color: "var(--accent)" }}>2 кредита</span>
            </div>
            <button onClick={handleSubmit}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                width: "100%", height: 52, borderRadius: 16,
                background: "var(--accent)", border: "none", cursor: "pointer",
              }}>
              <Video size={20} color="#0A0A0A" />
              <span style={{ fontFamily: "var(--font-primary)", fontSize: 16, fontWeight: 700, color: "#0A0A0A" }}>Оживить — 2 кредита</span>
            </button>
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
        {warningBanner}
        {modelSectionEl}
        {costRow}
      </div>
      <div style={{ padding: "12px 20px 24px 20px" }}>
        {ctaButton}
      </div>
    </Layout>
  );
}
