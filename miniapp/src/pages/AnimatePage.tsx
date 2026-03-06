import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { useIsDesktop } from "../hooks/useMediaQuery";
import { haptic } from "../telegram";
import { Upload, Video, Image, Clapperboard, X as XIcon } from "lucide-react";

type AnimeDuration = "5" | "10";

const DURATIONS: { label: string; value: AnimeDuration; cost: number }[] = [
  { label: "5 сек", value: "5", cost: 30 },
  { label: "10 сек", value: "10", cost: 60 },
];

export default function AnimatePage() {
  const isDesktop = useIsDesktop();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [duration, setDuration] = useState<AnimeDuration>("5");
  const [prompt, setPrompt] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const cost = DURATIONS.find((d) => d.value === duration)?.cost ?? 30;

  const handleFile = (file: File) => {
    if (file.size > 10 * 1024 * 1024) return;
    if (!file.type.startsWith("image/")) return;
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreview(url);
  };

  const handleUploadClick = () => {
    haptic();
    fileInputRef.current?.click();
  };

  const handleSubmit = () => {
    if (!selectedFile) return;
    haptic("medium");
    // TODO: submit to API
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const uploadAreaMobile = (
    <div
      onClick={handleUploadClick}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 12, borderRadius: 20,
        background: "var(--surface)", border: "1px dashed var(--border)",
        height: 160, width: "100%", cursor: "pointer",
        overflow: "hidden", position: "relative",
      }}
    >
      {preview ? (
        <img src={preview} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <>
          <Upload size={40} color="#52525B" />
          <span style={{ fontFamily: "var(--font-primary)", fontSize: 18, fontWeight: 700, color: "var(--text)" }}>
            Загрузи фото
          </span>
          <span style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 500, color: "#52525B" }}>
            JPG, PNG до 10 МБ
          </span>
        </>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png"
        style={{ display: "none" }}
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
    </div>
  );

  const uploadAreaDesktop = (
    <div
      onClick={handleUploadClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 12, borderRadius: 16,
        background: isDragging ? "#18181B" : "var(--surface)",
        border: `2px dashed ${isDragging ? "#C4F82A" : "var(--border)"}`,
        height: 240, width: "100%", cursor: "pointer",
        overflow: "hidden", position: "relative",
        transition: "border-color 0.15s",
      }}
    >
      {preview ? (
        <img src={preview} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <>
          <Upload size={48} color="#52525B" />
          <span style={{ fontFamily: "var(--font-primary)", fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
            Перетащите фото сюда
          </span>
          <span style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 500, color: "#52525B" }}>
            JPG, PNG до 10 МБ
          </span>
        </>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png"
        style={{ display: "none" }}
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
    </div>
  );

  const promptSection = (
    <div style={{ display: "flex", flexDirection: "column", gap: isDesktop ? 10 : 12, width: "100%" }}>
      <span style={{
        fontFamily: isDesktop ? "var(--font-body)" : "var(--font-primary)",
        fontSize: isDesktop ? 14 : 16, fontWeight: isDesktop ? 600 : 700,
        color: isDesktop ? "var(--text-secondary)" : "var(--text)",
      }}>
        Описание движения
      </span>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Опишите, как должно двигаться фото..."
        style={{
          width: "100%", height: 100, borderRadius: isDesktop ? 12 : 16,
          background: "var(--surface)", border: "1px solid var(--border)",
          color: "var(--text)", fontFamily: "var(--font-body)", fontSize: 14,
          fontWeight: 500, padding: "12px 14px", resize: "none",
          outline: "none", boxSizing: "border-box",
        }}
      />
    </div>
  );

  const durationSection = (
    <div style={{ display: "flex", flexDirection: "column", gap: isDesktop ? 10 : 12, width: "100%" }}>
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
                flex: isDesktop ? undefined : 1,
                padding: isDesktop ? "8px 20px" : "10px 16px",
                borderRadius: isDesktop ? 100 : 12,
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
      padding: isDesktop ? "14px 16px" : "12px 16px", borderRadius: 12,
      background: "var(--surface)", border: "1px solid var(--border)", width: "100%",
    }}>
      <span style={{ fontFamily: "var(--font-body)", fontSize: isDesktop ? 14 : 13, fontWeight: 500, color: "var(--text-secondary)" }}>
        Стоимость
      </span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: isDesktop ? 16 : 14, fontWeight: isDesktop ? 700 : 500, color: "var(--accent)" }}>
        ⚡ {cost} токенов
      </span>
    </div>
  );

  const ctaButton = (
    <button onClick={handleSubmit}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        width: "100%", height: 52, borderRadius: isDesktop ? 12 : 16,
        background: "#C4F82A", border: "none", cursor: "pointer",
        opacity: selectedFile ? 1 : 0.5,
      }}
      disabled={!selectedFile}
    >
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
        <div style={{ display: "flex", gap: 48, padding: "40px 60px", flex: 1 }}>
          {/* Left column - settings */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24, width: 480 }}>
            {/* Breadcrumb */}
            <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-muted)" }}>
              Создать &gt; Оживить фото
            </span>
            <h1 style={{ fontFamily: "var(--font-primary)", fontSize: 28, fontWeight: 700, color: "var(--text)", margin: 0 }}>
              Оживить фото
            </h1>
            {/* Фото section */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <span style={{ fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>Фото</span>
              {uploadAreaDesktop}
            </div>
            {promptSection}
            {durationSection}
            {costRow}
            {ctaButton}
          </div>
          {/* Right column - preview */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            flex: 1,
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              flexDirection: "column", gap: 12,
              width: 520, height: 520, borderRadius: 16,
              background: "var(--surface)", border: "1px solid var(--border)",
              overflow: "hidden",
            }}>
              {preview ? (
                <img src={preview} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <>
                  <Image size={64} color="#27272A" />
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "#52525B" }}>
                    Превью будет здесь
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // MOBILE
  return (
    <Layout title="Оживить фото" showBack showTabBar={false}>
      <div style={{
        display: "flex", flexDirection: "column", gap: 20,
        padding: "16px 20px", flex: 1,
      }}>
        {/* Фото section */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <span style={{ fontFamily: "var(--font-primary)", fontSize: 16, fontWeight: 700, color: "var(--text)" }}>Фото</span>
          {uploadAreaMobile}
        </div>
        {promptSection}
        {durationSection}
        {costRow}
      </div>
      <div style={{ padding: "12px 20px 24px 20px" }}>
        {ctaButton}
      </div>
    </Layout>
  );
}
