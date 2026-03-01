import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { useIsDesktop } from "../hooks/useMediaQuery";
import { haptic } from "../telegram";
import { Upload, Clapperboard, CirclePlay, Play, Timer, ArrowLeft, Music } from "lucide-react";

const DURATIONS = ["15 сек", "30 сек", "60 сек"];
const MODELS = ["Kling 2.6", "Kling 3.0", "Veo"];
const COST = 3;

const MOCK_TEMPLATE = {
  title: "Танцевальный тренд",
  category: "Танцы",
  duration: "15 сек",
  description: "Динамичный шаблон с неоновыми эффектами. Загрузите своё фото — лицо будет вставлено в видео.",
};

export default function ReelsTemplatePage() {
  const isDesktop = useIsDesktop();
  const { templateId } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [activeDuration, setActiveDuration] = useState(DURATIONS[0]);
  const [activeModel, setActiveModel] = useState(MODELS[0]);

  const template = MOCK_TEMPLATE;

  const handleFile = (file: File) => {
    if (file.size > 10 * 1024 * 1024) return;
    if (!file.type.startsWith("image/")) return;
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = () => {
    haptic("medium");
    navigate("/loading/mock-reels-task");
  };

  const pillButton = (label: string, active: boolean, onClick: () => void, radius = 100) => (
    <button onClick={() => { haptic(); onClick(); }}
      style={{
        padding: isDesktop ? "10px 24px" : "8px 18px",
        borderRadius: isDesktop ? 10 : radius,
        background: active ? "var(--accent)" : "var(--surface)",
        border: active ? "none" : "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
      <span style={{
        fontFamily: "var(--font-body)", fontSize: 13,
        fontWeight: active ? 600 : 500,
        color: active ? "#0A0A0A" : "var(--text-secondary)",
      }}>{label}</span>
    </button>
  );

  // DESKTOP
  if (isDesktop) {
    return (
      <Layout showTabBar={false}>
        <div style={{ display: "flex", gap: 48, padding: "40px 80px", flex: 1 }}>
          {/* Left column - preview */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20, width: 480 }}>
            <button onClick={() => navigate(-1)}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: 0 }}>
              <ArrowLeft size={20} color="var(--text-secondary)" />
              <span style={{ fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 500, color: "var(--text-secondary)" }}>
                Назад к шаблонам
              </span>
            </button>
            <div style={{
              width: "100%", height: 540, borderRadius: 16,
              background: "#27272A", position: "relative",
              overflow: "hidden",
            }}>
              {/* Play button */}
              <div style={{
                position: "absolute", top: "50%", left: "50%",
                transform: "translate(-50%, -50%)",
                width: 56, height: 56, borderRadius: 100,
                background: "rgba(0,0,0,0.5)", display: "flex",
                alignItems: "center", justifyContent: "center",
              }}>
                <Play size={24} color="var(--text)" fill="var(--text)" />
              </div>
              {/* Duration badge */}
              <div style={{
                position: "absolute", top: 16, left: 16,
                display: "flex", alignItems: "center", gap: 4,
                padding: "6px 10px", borderRadius: 8,
                background: "rgba(0,0,0,0.6)",
              }}>
                <Timer size={14} color="var(--text)" />
                <span style={{ fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{template.duration}</span>
              </div>
              {/* Bottom gradient + title */}
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0,
                height: 160, background: "linear-gradient(transparent, rgba(0,0,0,0.8))",
                display: "flex", alignItems: "flex-end", padding: 20,
              }}>
                <span style={{ fontFamily: "var(--font-primary)", fontSize: 22, fontWeight: 700, color: "var(--text)" }}>
                  {template.title}
                </span>
              </div>
            </div>
          </div>

          {/* Right column - settings */}
          <div style={{ display: "flex", flexDirection: "column", gap: 28, flex: 1 }}>
            {/* Title section */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <span style={{ fontFamily: "var(--font-primary)", fontSize: 28, fontWeight: 700, color: "var(--text)" }}>
                {template.title}
              </span>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 14px", borderRadius: 100,
                  background: "var(--surface)", border: "1px solid var(--border)",
                }}>
                  <Music size={14} color="var(--accent)" />
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 600, color: "var(--accent)" }}>{template.category}</span>
                </div>
                <div style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 14px", borderRadius: 100,
                  background: "var(--surface)", border: "1px solid var(--border)",
                }}>
                  <Timer size={14} color="var(--text-secondary)" />
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>{template.duration}</span>
                </div>
              </div>
              <span style={{
                fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-muted)",
                lineHeight: 1.5,
              }}>
                {template.description}
              </span>
            </div>

            {/* Upload section */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <span style={{ fontFamily: "var(--font-body)", fontSize: 16, fontWeight: 600, color: "var(--text)" }}>Загрузите фото</span>
              <div onClick={() => fileInputRef.current?.click()}
                style={{
                  height: 140, borderRadius: 12, width: "100%",
                  background: "var(--surface)", border: "1px solid var(--border)",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  gap: 10, cursor: "pointer", overflow: "hidden",
                }}>
                {preview ? (
                  <img src={preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <>
                    <Upload size={28} color="#52525B" />
                    <span style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-muted)" }}>
                      Перетащите фото сюда или нажмите для загрузки
                    </span>
                    <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "#52525B" }}>JPG, PNG до 10 МБ</span>
                  </>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" style={{ display: "none" }}
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </div>

            {/* Duration */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <span style={{ fontFamily: "var(--font-body)", fontSize: 16, fontWeight: 600, color: "var(--text)" }}>Длительность</span>
              <div style={{ display: "flex", gap: 12 }}>
                {DURATIONS.map((d) => pillButton(d, activeDuration === d, () => setActiveDuration(d)))}
              </div>
            </div>

            {/* Model */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <span style={{ fontFamily: "var(--font-body)", fontSize: 16, fontWeight: 600, color: "var(--text)" }}>Модель</span>
              <div style={{ display: "flex", gap: 12 }}>
                {MODELS.map((m) => pillButton(m, activeModel === m, () => setActiveModel(m)))}
              </div>
            </div>

            <div style={{ flex: 1 }} />

            {/* CTA row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-muted)" }}>Стоимость</span>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 18, fontWeight: 700, color: "var(--text)" }}>{COST} кредита</span>
              </div>
              <button onClick={handleSubmit}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "16px 32px", borderRadius: 12,
                  background: "var(--accent)", border: "none", cursor: "pointer",
                }}>
                <Clapperboard size={20} color="#0A0A0A" />
                <span style={{ fontFamily: "var(--font-body)", fontSize: 16, fontWeight: 700, color: "#0A0A0A" }}>
                  Создать Reels — {COST} кредита
                </span>
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // MOBILE
  return (
    <Layout title="Шаблон Reels" showBack showTabBar={false}>
      <div style={{
        display: "flex", flexDirection: "column", gap: 20,
        padding: "12px 20px", flex: 1, overflowY: "auto",
      }}>
        {/* Template preview */}
        <div style={{
          width: "100%", height: 200, borderRadius: 16,
          background: "#27272A", position: "relative",
          overflow: "hidden", border: "1px solid var(--border)",
        }}>
          {/* Badge */}
          <div style={{
            position: "absolute", top: 12, left: 12,
            padding: "4px 8px", borderRadius: 6,
            background: "rgba(0,0,0,0.6)",
          }}>
            <span style={{ fontFamily: "var(--font-body)", fontSize: 10, fontWeight: 600, color: "var(--text)" }}>{template.duration}</span>
          </div>
          {/* Play */}
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
          }}>
            <CirclePlay size={44} color="rgba(255,255,255,0.8)" />
          </div>
          {/* Bottom gradient */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: 60,
            background: "linear-gradient(transparent, rgba(0,0,0,0.8))",
            display: "flex", alignItems: "flex-end", padding: "8px 14px",
          }}>
            <span style={{ fontFamily: "var(--font-primary)", fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
              {template.title}
            </span>
          </div>
        </div>

        {/* Category chip + description */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "4px 12px", borderRadius: 100, alignSelf: "flex-start",
            background: "var(--surface)", border: "1px solid var(--border)",
          }}>
            <Music size={14} color="var(--accent)" />
            <span style={{ fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 600, color: "var(--accent)" }}>
              {template.category}
            </span>
          </div>
          <span style={{
            fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 500,
            color: "var(--text-secondary)", lineHeight: 1.4,
          }}>
            {template.description}
          </span>
        </div>

        {/* Upload */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={{ fontFamily: "var(--font-primary)", fontSize: 16, fontWeight: 700, color: "var(--text)" }}>Загрузите фото</span>
          <div onClick={() => fileInputRef.current?.click()}
            style={{
              height: 120, borderRadius: 16, width: "100%",
              background: "var(--surface)", border: "1px solid var(--border)",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 8, cursor: "pointer", overflow: "hidden",
            }}>
            {preview ? (
              <img src={preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <>
                <Upload size={28} color="var(--text-muted)" />
                <span style={{ fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Загрузи фото</span>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 500, color: "#52525B" }}>JPG, PNG до 10 МБ</span>
              </>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" style={{ display: "none" }}
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </div>

        {/* Duration */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={{ fontFamily: "var(--font-primary)", fontSize: 16, fontWeight: 700, color: "var(--text)" }}>Длительность</span>
          <div style={{ display: "flex", gap: 8 }}>
            {DURATIONS.map((d) => pillButton(d, activeDuration === d, () => setActiveDuration(d)))}
          </div>
        </div>

        {/* Model */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={{ fontFamily: "var(--font-primary)", fontSize: 16, fontWeight: 700, color: "var(--text)" }}>Модель</span>
          <div style={{ display: "flex", gap: 8 }}>
            {MODELS.map((m) => pillButton(m, activeModel === m, () => setActiveModel(m)))}
          </div>
        </div>

        {/* Cost row */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 16px", borderRadius: 12,
          background: "var(--surface)", border: "1px solid var(--border)",
        }}>
          <span style={{ fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 500, color: "var(--text-secondary)" }}>Стоимость</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: "var(--accent)" }}>{COST}  кредита</span>
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: "12px 20px 24px 20px" }}>
        <button onClick={handleSubmit}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            width: "100%", height: 52, borderRadius: 16,
            background: "var(--accent)", border: "none", cursor: "pointer",
          }}>
          <Clapperboard size={20} color="#0A0A0A" />
          <span style={{ fontFamily: "var(--font-primary)", fontSize: 16, fontWeight: 700, color: "#0A0A0A" }}>
            Создать Reels — {COST} кредита
          </span>
        </button>
      </div>
    </Layout>
  );
}
