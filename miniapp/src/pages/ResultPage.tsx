import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Layout } from "../components/Layout";
import { useIsDesktop } from "../hooks/useMediaQuery";
import { api } from "../api";
import { haptic } from "../telegram";
import type { GenerateStatus } from "../types";
import { X, Share2, Download, Sparkles, Heart } from "lucide-react";

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

export default function ResultPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isDesktop = useIsDesktop();
  const [status, setStatus] = useState<GenerateStatus | null>(null);

  const genState = location.state as {
    prompt?: string;
    model?: string;
    aspectRatio?: string;
  } | null;

  const [genPrompt, setGenPrompt] = useState(genState?.prompt || "");
  const [genModel, setGenModel] = useState(genState?.model || "");
  const [genAspect, setGenAspect] = useState(genState?.aspectRatio || "");

  useEffect(() => {
    if (taskId) {
      api.getGenerationStatus(taskId).then(setStatus);
    }
  }, [taskId]);

  // Fallback: if no state passed, fetch from API
  useEffect(() => {
    if (!genState && taskId) {
      api.getGenerationByTask(taskId).then((gen) => {
        if (gen.prompt) setGenPrompt(gen.prompt);
        if (gen.model) setGenModel(gen.model);
        if (gen.aspect_ratio) setGenAspect(gen.aspect_ratio);
      }).catch(() => {});
    }
  }, [taskId, genState]);

  const resultUrl = status?.result_url || "";
  const displayModel = MODEL_NAMES[genModel] || genModel || "—";
  const displayAspect = genAspect || "1:1";

  function handleDownload() {
    haptic("medium");
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = `photix-${taskId}.png`;
    a.click();
  }

  if (!status) {
    return (
      <Layout fullScreen>
        <div style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            width: 40, height: 40, border: "3px solid #27272A",
            borderTopColor: "#C4F82A", borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }} />
        </div>
      </Layout>
    );
  }

  /* ─── Mobile Layout ─── */
  if (!isDesktop) {
    return (
      <Layout fullScreen>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          height: 56, padding: "0 20px", flexShrink: 0,
        }}>
          <button onClick={() => navigate("/")} style={{ display: "flex", padding: 0, background: "none", border: "none" }}>
            <X size={24} color="#FFFFFF" />
          </button>
          <span style={{ fontFamily: "var(--font-primary)", fontSize: 18, fontWeight: 700, color: "#FFFFFF" }}>
            Результат
          </span>
          <button style={{ display: "flex", padding: 0, background: "none", border: "none" }}>
            <Share2 size={24} color="#FFFFFF" />
          </button>
        </div>

        {/* Image + Info */}
        <div style={{
          flex: 1, overflowY: "auto", padding: "12px 20px",
          display: "flex", flexDirection: "column", gap: 16,
        }}>
          {/* Result image */}
          <div style={{
            width: "100%", aspectRatio: "335 / 360", borderRadius: 20,
            overflow: "hidden", border: "1px solid #27272A",
          }}>
            {resultUrl ? (
              <img src={resultUrl} alt="Result" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{
                width: "100%", height: "100%", background: "#18181B",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ color: "#52525B", fontFamily: "var(--font-body)", fontSize: 14 }}>
                  Изображение не найдено
                </span>
              </div>
            )}
          </div>

          {/* Info card */}
          <div style={{
            padding: 16, borderRadius: 16, background: "#18181B",
            border: "1px solid #27272A",
            display: "flex", flexDirection: "column", gap: 8,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#A1A1AA" }}>
                Модель
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "#FFFFFF" }}>
                {displayModel}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#A1A1AA" }}>
                Формат
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "#FFFFFF" }}>
                {displayAspect}
              </span>
            </div>
            {genPrompt && (
              <div style={{ marginTop: 4 }}>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "#52525B" }}>Промпт</span>
                <p style={{
                  fontFamily: "var(--font-body)", fontSize: 13, color: "#A1A1AA",
                  lineHeight: 1.5, margin: "4px 0 0",
                  display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}>
                  {genPrompt}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div style={{
          padding: "12px 20px 32px 20px", display: "flex", flexDirection: "column", gap: 10,
          flexShrink: 0,
        }}>
          <button onClick={handleDownload}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              height: 57, borderRadius: 16, background: "#C4F82A", border: "none",
              width: "100%",
            }}>
            <Download size={20} color="#0A0A0A" />
            <span style={{ fontFamily: "var(--font-primary)", fontSize: 16, fontWeight: 700, color: "#0A0A0A" }}>
              Скачать
            </span>
          </button>
          <button onClick={() => { haptic(); navigate("/create/photo"); }}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              height: 57, borderRadius: 16, background: "#18181B",
              border: "1px solid #27272A", width: "100%",
            }}>
            <Sparkles size={18} color="#C4F82A" />
            <span style={{ fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 600, color: "#FFFFFF" }}>
              Создать ещё
            </span>
          </button>
        </div>
      </Layout>
    );
  }

  /* ─── Desktop Layout ─── */
  return (
    <Layout>
      <div style={{
        display: "flex", gap: 32, padding: "32px 0",
        minHeight: "calc(100vh - 64px - 56px)",
      }}>
        {/* Image column */}
        <div style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            width: 540, height: 540, borderRadius: 16, overflow: "hidden",
            border: "1px solid #27272A",
          }}>
            {resultUrl ? (
              <img src={resultUrl} alt="Result" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{
                width: "100%", height: "100%", background: "#18181B",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ color: "#52525B" }}>Изображение не найдено</span>
              </div>
            )}
          </div>
        </div>

        {/* Info column */}
        <div style={{
          width: 380, display: "flex", flexDirection: "column", gap: 24,
          padding: "8px 0",
        }}>
          {/* Header row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "var(--font-primary)", fontSize: 24, fontWeight: 700, color: "#FFFFFF" }}>
              Результат
            </span>
            <div style={{ display: "flex", gap: 12 }}>
              <button style={{ display: "flex", padding: 0, background: "none", border: "none" }}>
                <Heart size={20} color="#A1A1AA" />
              </button>
              <button style={{ display: "flex", padding: 0, background: "none", border: "none" }}>
                <Share2 size={20} color="#A1A1AA" />
              </button>
            </div>
          </div>

          {/* Params card */}
          <div style={{
            padding: 20, borderRadius: 12, background: "#18181B",
            border: "1px solid #27272A",
            display: "flex", flexDirection: "column", gap: 12,
          }}>
            {[
              { label: "Модель", value: displayModel },
              { label: "Формат", value: displayAspect },
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#A1A1AA" }}>
                  {row.label}
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "#FFFFFF" }}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button onClick={handleDownload}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                height: 48, borderRadius: 12, background: "#C4F82A",
                border: "none", width: "100%",
              }}>
              <Download size={18} color="#0A0A0A" />
              <span style={{ fontFamily: "var(--font-body)", fontSize: 15, fontWeight: 600, color: "#0A0A0A" }}>
                Скачать
              </span>
            </button>
            <button onClick={() => { haptic(); navigate("/create/photo"); }}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                height: 48, borderRadius: 12, background: "#0A0A0A",
                border: "1px solid #27272A", width: "100%",
              }}>
              <Sparkles size={18} color="#FFFFFF" />
              <span style={{ fontFamily: "var(--font-body)", fontSize: 15, fontWeight: 600, color: "#FFFFFF" }}>
                Создать ещё
              </span>
            </button>
          </div>

          {/* Prompt card */}
          {genPrompt && (
            <div style={{
              padding: "16px 20px", borderRadius: 12, background: "#18181B",
              border: "1px solid #27272A",
              display: "flex", flexDirection: "column", gap: 8,
            }}>
              <span style={{ fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 600, color: "#A1A1AA" }}>
                Промпт
              </span>
              <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#FFFFFF", lineHeight: 1.5 }}>
                {genPrompt}
              </span>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
