import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Layout } from "../components/Layout";
import { useIsDesktop } from "../hooks/useMediaQuery";
import { api } from "../api";
import { haptic } from "../telegram";
import type { Gender, AspectRatio, PostDetail } from "../types";
import {
  ArrowLeft, Sparkles, Square, Monitor, Smartphone,
  Plus, HelpCircle, Image, Coins, X, Loader2,
} from "lucide-react";

interface ModelDef {
  id: string;
  name: string;
  desc: string;
  price: string;
  priceNum: number;
  type: "text2img" | "img2img" | "text/img2img";
  formats: AspectRatio[];
}

const ALL_FORMATS: AspectRatio[] = ["1:1", "16:9", "9:16"];

const MODELS: ModelDef[] = [
  { id: "nano_banana", name: "Nano Banana", desc: "Быстрая генерация, базовое качество", price: "1 кр", priceNum: 1, type: "text2img", formats: ALL_FORMATS },
  { id: "banana", name: "Nano Banana Pro", desc: "Улучшенное качество", price: "2 кр", priceNum: 2, type: "text2img", formats: ALL_FORMATS },
  { id: "seedream", name: "Seedream 4.5", desc: "Реалистичные фото", price: "2 кр", priceNum: 2, type: "text2img", formats: ALL_FORMATS },
  { id: "seedream_v4", name: "Seedream V4", desc: "Новое поколение", price: "2 кр", priceNum: 2, type: "text2img", formats: ALL_FORMATS },
  { id: "gpt_text", name: "GPT Image", desc: "OpenAI text-to-image", price: "3 кр", priceNum: 3, type: "text2img", formats: ALL_FORMATS },
  { id: "gpt_img2img", name: "GPT Img2Img", desc: "OpenAI image-to-image", price: "4 кр", priceNum: 4, type: "img2img", formats: ALL_FORMATS },
  { id: "gpt4o", name: "GPT-4o", desc: "GPT-4o нативная генерация", price: "5 кр", priceNum: 5, type: "text/img2img", formats: ALL_FORMATS },
  { id: "qwen", name: "Qwen", desc: "Alibaba модель", price: "3 кр", priceNum: 3, type: "text2img", formats: ALL_FORMATS },
  { id: "grok", name: "Grok Imagine", desc: "xAI модель", price: "3 кр", priceNum: 3, type: "text2img", formats: ALL_FORMATS },
];

const GENDERS: { key: Gender; label: string }[] = [
  { key: "male", label: "Мужское" },
  { key: "female", label: "Женское" },
  { key: "unisex", label: "Унисекс" },
];

const ASPECTS: { key: AspectRatio; label: string; icon: typeof Square }[] = [
  { key: "1:1", label: "1:1", icon: Square },
  { key: "16:9", label: "16:9", icon: Monitor },
  { key: "9:16", label: "9:16", icon: Smartphone },
];

interface UploadedRef {
  url: string;        // server URL (empty while uploading)
  preview: string;    // local blob URL for display
  uploading?: boolean;
  error?: boolean;
}

export default function GeneratePage() {
  const { postId } = useParams<{ postId?: string }>();
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isStandalone = !postId;

  const [gender, setGender] = useState<Gender>("male");
  const [prompt, setPrompt] = useState("");
  const [aspect, setAspect] = useState<AspectRatio>("1:1");
  const [model, setModel] = useState("nano_banana");
  const [post, setPost] = useState<PostDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [showRefTooltip, setShowRefTooltip] = useState(false);

  // Standalone mode: uploaded references
  const [uploadedRefs, setUploadedRefs] = useState<UploadedRef[]>([]);

  // Post mode: use references toggle
  const [useRefs, setUseRefs] = useState(true);
  const [promptMode, setPromptMode] = useState<"original" | "custom">("original");

  useEffect(() => {
    if (postId) {
      api.getPost(Number(postId)).then((p) => {
        setPost(p);
        if (p.prompt) setPrompt(p.prompt);
      });
    }
  }, [postId]);

  const selectedModel = MODELS.find((m) => m.id === model)!;
  const availableFormats = selectedModel.formats;

  // Reset aspect ratio if current model doesn't support it
  useEffect(() => {
    if (!availableFormats.includes(aspect)) {
      setAspect(availableFormats[0]);
    }
  }, [model, availableFormats, aspect]);
  const charLimit = 999;

  async function handleUploadRef() {
    fileInputRef.current?.click();
  }

  async function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || uploadedRefs.length >= 3) return;
    if (fileInputRef.current) fileInputRef.current.value = "";

    const preview = URL.createObjectURL(file);
    const idx = uploadedRefs.length;

    // Show preview immediately with uploading state
    setUploadedRefs((prev) => [...prev, { url: "", preview, uploading: true }]);

    try {
      const { url } = await api.uploadReference(file);
      setUploadedRefs((prev) =>
        prev.map((r, i) => (i === idx ? { ...r, url, uploading: false } : r))
      );
    } catch {
      // Upload failed — keep preview but mark as local-only
      setUploadedRefs((prev) =>
        prev.map((r, i) => (i === idx ? { ...r, url: preview, uploading: false, error: true } : r))
      );
    }
  }

  function removeRef(idx: number) {
    setUploadedRefs((prev) => {
      const next = [...prev];
      URL.revokeObjectURL(next[idx].preview);
      next.splice(idx, 1);
      return next;
    });
  }

  async function handleGenerate() {
    if (loading) return;
    if (isStandalone && !prompt.trim()) return;
    haptic("medium");
    setLoading(true);
    try {
      if (isStandalone) {
        const res = await api.startDirectGeneration({
          prompt: prompt.trim(),
          model,
          aspect_ratio: aspect,
          reference_urls: uploadedRefs.filter((r) => r.url && !r.uploading).map((r) => r.url),
        });
        navigate(`/loading/${res.task_id}`);
      } else {
        const res = await api.startGeneration({
          post_id: post?.id ?? 0,
          prompt_mode: promptMode,
          custom_prompt: promptMode === "custom" ? prompt : undefined,
          aspect_ratio: aspect,
          use_references: useRefs,
          model,
        });
        navigate(`/loading/${res.task_id}`);
      }
    } catch {
      setLoading(false);
    }
  }

  const canGenerate = isStandalone ? prompt.trim().length > 0 : true;

  /* ─── Hidden file input ─── */
  const hiddenFileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      onChange={onFileSelected}
      style={{ display: "none" }}
    />
  );

  /* ─── Shared section builders ─── */

  const genderSelector = (
    <div style={{ display: "flex", gap: 8, padding: "8px 0" }}>
      {GENDERS.map((g) => {
        const active = gender === g.key;
        return (
          <button key={g.key} onClick={() => { haptic(); setGender(g.key); }}
            style={{
              flex: 1, height: 36, borderRadius: 12, display: "flex",
              alignItems: "center", justifyContent: "center",
              background: active ? "#C4F82A" : "#18181B",
              border: active ? "none" : "1px solid #27272A",
              color: active ? "#0A0A0A" : "#A1A1AA",
              fontFamily: "var(--font-body)", fontSize: 13,
              fontWeight: active ? 600 : 500, transition: "all 0.2s",
            }}>
            {g.label}
          </button>
        );
      })}
    </div>
  );

  const promptModeSection = !isStandalone ? (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <span style={{ fontFamily: "var(--font-primary)", fontSize: 16, fontWeight: 700, color: "#FFFFFF" }}>
        Режим промпта
      </span>
      <div style={{ display: "flex", gap: 8 }}>
        {(["original", "custom"] as const).map((m) => {
          const active = promptMode === m;
          return (
            <button key={m} onClick={() => { haptic(); setPromptMode(m); }}
              style={{
                flex: 1, padding: "10px 16px", borderRadius: 12,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: active ? "#C4F82A" : "#18181B",
                border: active ? "none" : "1px solid #27272A",
                color: active ? "#0A0A0A" : "#A1A1AA",
                fontFamily: "var(--font-body)", fontSize: 13,
                fontWeight: active ? 600 : 500, transition: "all 0.2s",
              }}>
              {m === "original" ? "Original" : "Custom"}
            </button>
          );
        })}
      </div>
    </div>
  ) : null;

  const promptSection = (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={{ fontFamily: "var(--font-primary)", fontSize: 16, fontWeight: 700, color: "#FFFFFF" }}>
        Промпт {isStandalone && <span style={{ color: "#EF4444", fontSize: 14 }}>*</span>}
      </span>
      <div style={{
        borderRadius: 16, background: "#18181B", border: "1px solid #27272A",
        padding: 16, height: 120, display: "flex", flexDirection: "column",
      }}>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value.slice(0, charLimit))}
          placeholder="Красивая пара в элегантных костюмах, кинематографичное освещение, боке на фоне..."
          style={{
            flex: 1, resize: "none", background: "none", border: "none", outline: "none",
            color: "#D4D4D8", fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 400,
            width: "100%", lineHeight: 1.5,
          }}
        />
      </div>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#52525B" }}>
        {prompt.length} / {charLimit}
      </span>
    </div>
  );

  const refsSection = (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontFamily: "var(--font-primary)", fontSize: 16, fontWeight: 700, color: "#FFFFFF" }}>
            Референсы
          </span>
          <button onClick={() => setShowRefTooltip(true)}
            style={{
              width: 20, height: 20, borderRadius: 100, display: "flex",
              alignItems: "center", justifyContent: "center",
              border: "1px solid #52525B", background: "none", padding: 0,
            }}>
            <HelpCircle size={12} color="#52525B" />
          </button>
        </div>
        {!isStandalone && (
          <button onClick={() => { haptic(); setUseRefs(!useRefs); }}
            style={{
              padding: "4px 12px", borderRadius: 100,
              background: useRefs ? "#C4F82A" : "#27272A",
              color: useRefs ? "#0A0A0A" : "#A1A1AA",
              fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600,
              border: "none", transition: "all 0.2s",
            }}>
            {useRefs ? "Использовать" : "Выкл"}
          </button>
        )}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {/* Post-mode: show post references */}
        {!isStandalone && post && post.references.length > 0 && post.references.slice(0, 2).map((ref) => (
          <div key={ref.order} style={{
            width: 80, height: 80, borderRadius: 12, overflow: "hidden",
            border: "1px solid #27272A",
          }}>
            <img src={api.getReferenceImageUrl(post.id, ref.order)} alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        ))}

        {/* Standalone mode: show uploaded references */}
        {isStandalone && uploadedRefs.map((ref, idx) => (
          <div key={idx} style={{
            width: 80, height: 80, borderRadius: 12, overflow: "hidden",
            border: ref.error ? "1px solid #EF4444" : "1px solid #27272A", position: "relative",
          }}>
            <img src={ref.preview} alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            {ref.uploading && (
              <div style={{
                position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Loader2 size={20} color="#C4F82A" style={{ animation: "spin 1s linear infinite" }} />
              </div>
            )}
            {!ref.uploading && (
              <button onClick={() => removeRef(idx)}
                style={{
                  position: "absolute", top: 4, right: 4,
                  width: 20, height: 20, borderRadius: 100,
                  background: "rgba(0,0,0,0.7)", border: "none",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  padding: 0,
                }}>
                <X size={12} color="#FFFFFF" />
              </button>
            )}
          </div>
        ))}

        {/* Add button */}
        {(isStandalone ? uploadedRefs.length < 3 : true) && (
          <button
            onClick={isStandalone ? handleUploadRef : undefined}
            style={{
              width: 80, height: 80, borderRadius: 12, background: "#18181B",
              border: "1px solid #27272A", display: "flex", alignItems: "center",
              justifyContent: "center",
            }}>
            <Plus size={24} color="#52525B" />
          </button>
        )}
      </div>
    </div>
  );

  const aspectSection = (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <span style={{ fontFamily: "var(--font-primary)", fontSize: 16, fontWeight: 700, color: "#FFFFFF" }}>
        Формат
      </span>
      <div style={{ display: "flex", gap: 8 }}>
        {ASPECTS.filter((a) => availableFormats.includes(a.key)).map((a) => {
          const active = aspect === a.key;
          const Icon = a.icon;
          return (
            <button key={a.key} onClick={() => { haptic(); setAspect(a.key); }}
              style={{
                flex: 1, padding: "10px 16px", borderRadius: 12, gap: 8,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: active ? "#C4F82A" : "#18181B",
                border: active ? "none" : "1px solid #27272A",
                transition: "all 0.2s",
              }}>
              <Icon size={16} color={active ? "#0A0A0A" : "#52525B"} />
              <span style={{
                fontFamily: "var(--font-body)", fontSize: 13,
                fontWeight: active ? 600 : 500,
                color: active ? "#0A0A0A" : "#A1A1AA",
              }}>
                {a.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  // Build model rows: 2 per row
  const modelRows: ModelDef[][] = [];
  for (let i = 0; i < MODELS.length; i += 2) {
    modelRows.push(MODELS.slice(i, i + 2));
  }

  const modelSection = (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <span style={{ fontFamily: "var(--font-primary)", fontSize: 16, fontWeight: 700, color: "#FFFFFF" }}>
        Модель
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {modelRows.map((row, ri) => (
          <div key={ri} style={{ display: "flex", gap: 8 }}>
            {row.map((m) => {
              const active = model === m.id;
              return (
                <button key={m.id} onClick={() => { haptic(); setModel(m.id); }}
                  style={{
                    flex: 1, height: 80, borderRadius: 14, padding: "12px 14px",
                    display: "flex", flexDirection: "column", justifyContent: "center",
                    gap: 4,
                    background: active ? "#C4F82A" : "#18181B",
                    border: active ? "none" : "1px solid #27272A",
                    textAlign: "left", transition: "all 0.2s",
                  }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                    <span style={{
                      fontFamily: "var(--font-primary)", fontSize: 13, fontWeight: 700,
                      color: active ? "#0A0A0A" : "#FFFFFF",
                    }}>
                      {m.name}
                    </span>
                    <span style={{
                      fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600,
                      color: active ? "rgba(10,10,10,0.5)" : "#71717A",
                    }}>
                      {m.price}
                    </span>
                  </div>
                  <span style={{
                    fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 500,
                    color: active ? "rgba(10,10,10,0.6)" : "#71717A",
                  }}>
                    {m.desc}
                  </span>
                </button>
              );
            })}
            {row.length === 1 && <div style={{ flex: 1, height: 80 }} />}
          </div>
        ))}
      </div>
    </div>
  );

  const ctaButton = (
    <button onClick={handleGenerate} disabled={loading || !canGenerate}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        width: "100%", height: 52, borderRadius: 16, background: "#C4F82A",
        border: "none", opacity: (loading || !canGenerate) ? 0.5 : 1,
        transition: "opacity 0.2s",
      }}>
      <Sparkles size={20} color="#0A0A0A" />
      <span style={{ fontFamily: "var(--font-primary)", fontSize: 16, fontWeight: 700, color: "#0A0A0A" }}>
        {loading ? "Отправка..." : `Создать — ${selectedModel.priceNum} кредит`}
      </span>
    </button>
  );

  /* ─── Ref Tooltip Overlay ─── */
  const refTooltipOverlay = showRefTooltip ? (
    <div onClick={() => setShowRefTooltip(false)}
      style={{
        position: "fixed", inset: 0, background: "rgba(10,10,10,0.6)",
        zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center",
      }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{
          width: 310, borderRadius: 16, background: "#1E1E1E",
          border: "1px solid #3F3F46", padding: "16px 18px",
          display: "flex", flexDirection: "column", gap: 12,
        }}>
        <span style={{ fontFamily: "var(--font-primary)", fontSize: 16, fontWeight: 700, color: "#FFFFFF" }}>
          Что такое референсы?
        </span>
        <span style={{
          fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 500,
          color: "#A1A1AA", lineHeight: 1.5,
        }}>
          Загрузи 1-3 фото в качестве референса. AI будет использовать их как ориентир для стиля,
          композиции и настроения при генерации нового изображения.
          {"\n\n"}Чем точнее референсы — тем ближе результат к желаемому.
        </span>
        <button onClick={() => setShowRefTooltip(false)}
          style={{
            height: 36, borderRadius: 10, background: "#27272A",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "none",
          }}>
          <span style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 600, color: "#FFFFFF" }}>
            Понятно
          </span>
        </button>
      </div>
    </div>
  ) : null;

  /* ─── Mobile Layout ─── */
  if (!isDesktop) {
    return (
      <Layout title="Создать фото" showBack showTabBar={false} fullScreen>
        {hiddenFileInput}

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          height: 56, padding: "0 20px", flexShrink: 0,
        }}>
          <button onClick={() => navigate(-1)} style={{ display: "flex", padding: 0, background: "none", border: "none" }}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </button>
          <span style={{ fontFamily: "var(--font-primary)", fontSize: 18, fontWeight: 700, color: "#FFFFFF" }}>
            Создать фото
          </span>
          <div style={{ width: 24 }} />
        </div>

        {/* Step indicator */}
        <div style={{ display: "flex", justifyContent: "center", gap: 8, padding: "8px 20px" }}>
          <div style={{ width: 32, height: 4, borderRadius: 2, background: "#C4F82A" }} />
          <div style={{ width: 32, height: 4, borderRadius: 2, background: "#27272A" }} />
          <div style={{ width: 32, height: 4, borderRadius: 2, background: "#27272A" }} />
        </div>

        {/* Scrollable content */}
        <div style={{
          flex: 1, overflowY: "auto", padding: "16px 20px",
          display: "flex", flexDirection: "column", gap: 20,
        }}>
          {genderSelector}
          {promptModeSection}
          {promptSection}
          {refsSection}
          {aspectSection}
          {modelSection}
        </div>

        {/* CTA */}
        <div style={{ padding: "12px 20px 24px 20px", flexShrink: 0 }}>
          {ctaButton}
        </div>

        {refTooltipOverlay}
      </Layout>
    );
  }

  /* ─── Desktop Layout ─── */
  return (
    <Layout>
      {hiddenFileInput}

      <div style={{ display: "flex", gap: 40, padding: "32px 0" }}>
        {/* Settings column */}
        <div style={{
          width: 480, display: "flex", flexDirection: "column", gap: 24,
          flexShrink: 0,
        }}>
          {/* Step indicator + token badge */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {[1, 2, 3].map((s, i) => (
                <div key={s} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 100, display: "flex",
                    alignItems: "center", justifyContent: "center",
                    background: s === 1 ? "#C4F82A" : "#18181B",
                    border: s === 1 ? "none" : "1px solid #27272A",
                  }}>
                    <span style={{
                      fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700,
                      color: s === 1 ? "#0A0A0A" : "#52525B",
                    }}>
                      {s}
                    </span>
                  </div>
                  {i < 2 && <div style={{ width: 40, height: 2, background: "#27272A" }} />}
                </div>
              ))}
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 12px", borderRadius: 100,
              background: "#18181B", border: "1px solid #27272A",
            }}>
              <Coins size={14} color="#C4F82A" />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "#C4F82A" }}>
                47 токенов
              </span>
            </div>
          </div>

          {/* Mode section (only in post mode) */}
          {!isStandalone && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontFamily: "var(--font-primary)", fontSize: 16, fontWeight: 700, color: "#FFFFFF" }}>
                Режим
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                {(["original", "custom"] as const).map((m) => {
                  const active = promptMode === m;
                  return (
                    <button key={m} onClick={() => { haptic(); setPromptMode(m); }}
                      style={{
                        padding: "8px 18px", borderRadius: 100,
                        background: active ? "#C4F82A" : "#18181B",
                        border: active ? "none" : "1px solid #27272A",
                        color: active ? "#0A0A0A" : "#A1A1AA",
                        fontFamily: "var(--font-body)", fontSize: 13,
                        fontWeight: active ? 600 : 500, transition: "all 0.2s",
                      }}>
                      {m === "original" ? "Original" : "Custom"}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {promptSection}

          {/* Refs section */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontFamily: "var(--font-primary)", fontSize: 16, fontWeight: 700, color: "#FFFFFF" }}>
                Референсы
              </span>
              <button onClick={() => setShowRefTooltip(true)}
                style={{
                  width: 20, height: 20, borderRadius: 100, display: "flex",
                  alignItems: "center", justifyContent: "center",
                  border: "1px solid #52525B", background: "none", padding: 0,
                }}>
                <HelpCircle size={12} color="#52525B" />
              </button>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {/* Post mode refs */}
              {!isStandalone && post && post.references.slice(0, 2).map((ref) => (
                <div key={ref.order} style={{
                  width: 80, height: 80, borderRadius: 12, overflow: "hidden",
                  border: "1px solid #27272A",
                }}>
                  <img src={api.getReferenceImageUrl(post.id, ref.order)} alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              ))}

              {/* Standalone uploaded refs */}
              {isStandalone && uploadedRefs.map((ref, idx) => (
                <div key={idx} style={{
                  width: 80, height: 80, borderRadius: 12, overflow: "hidden",
                  border: ref.error ? "1px solid #EF4444" : "1px solid #27272A", position: "relative",
                }}>
                  <img src={ref.preview} alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  {ref.uploading && (
                    <div style={{
                      position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Loader2 size={20} color="#C4F82A" style={{ animation: "spin 1s linear infinite" }} />
                    </div>
                  )}
                  {!ref.uploading && (
                    <button onClick={() => removeRef(idx)}
                      style={{
                        position: "absolute", top: 4, right: 4,
                        width: 20, height: 20, borderRadius: 100,
                        background: "rgba(0,0,0,0.7)", border: "none",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        padding: 0,
                      }}>
                      <X size={12} color="#FFFFFF" />
                    </button>
                  )}
                </div>
              ))}

              {(isStandalone ? uploadedRefs.length < 3 : true) && (
                <button
                  onClick={isStandalone ? handleUploadRef : undefined}
                  style={{
                    width: 80, height: 80, borderRadius: 12, background: "none",
                    border: "1px solid #27272A", display: "flex",
                    alignItems: "center", justifyContent: "center",
                  }}>
                  <Plus size={24} color="#52525B" />
                </button>
              )}
            </div>
          </div>

          {/* Format section (desktop: pills) */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ fontFamily: "var(--font-primary)", fontSize: 16, fontWeight: 700, color: "#FFFFFF" }}>
              Формат
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              {ASPECTS.filter((a) => availableFormats.includes(a.key)).map((a) => {
                const active = aspect === a.key;
                return (
                  <button key={a.key} onClick={() => { haptic(); setAspect(a.key); }}
                    style={{
                      padding: "8px 18px", borderRadius: 100,
                      display: "flex", alignItems: "center",
                      background: active ? "#C4F82A" : "#18181B",
                      border: active ? "none" : "1px solid #27272A",
                      transition: "all 0.2s",
                    }}>
                    <span style={{
                      fontFamily: "var(--font-primary)", fontSize: 13,
                      fontWeight: active ? 700 : 500,
                      color: active ? "#0A0A0A" : "#A1A1AA",
                    }}>
                      {a.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {modelSection}

          {ctaButton}

          {/* Sub info */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: 6, padding: "8px 0",
          }}>
            <Sparkles size={14} color="#71717A" />
            <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#71717A" }}>
              Нет токенов?
            </span>
            <button onClick={() => navigate("/pricing")} style={{ border: "none", background: "none", padding: 0 }}>
              <span style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 600, color: "#C4F82A" }}>
                Подписка от 299р/мес
              </span>
            </button>
          </div>
        </div>

        {/* Preview column */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 16,
        }}>
          <div style={{
            width: 480, height: 480, borderRadius: 20, background: "#18181B",
            border: "1px solid #27272A", display: "flex", alignItems: "center",
            justifyContent: "center",
          }}>
            <Image size={48} color="#27272A" />
          </div>
          <span style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "#52525B" }}>
            Превью будет здесь
          </span>
        </div>
      </div>

      {refTooltipOverlay}
    </Layout>
  );
}
