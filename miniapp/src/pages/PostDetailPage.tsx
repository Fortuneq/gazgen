import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Layout } from "../components/Layout";
import { useIsDesktop } from "../hooks/useMediaQuery";
import { api } from "../api";
import { haptic } from "../telegram";
import type { PostDetail } from "../types";
import { ArrowLeft, Download, Sparkles, Play, Share2 } from "lucide-react";

export default function PostDetailPage() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const [post, setPost] = useState<PostDetail | null>(null);

  useEffect(() => {
    if (postId) {
      api.getPost(Number(postId)).then(setPost);
    }
  }, [postId]);

  if (!post) {
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

  const imageUrl = api.getResultImageUrl(post.id);
  const dateStr = new Date(post.created_at).toLocaleDateString("ru-RU", {
    day: "numeric", month: "short", year: "numeric",
  });

  function handleDownload() {
    haptic("medium");
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = `photix-${post!.id}.png`;
    a.click();
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
          <button onClick={() => navigate(-1)} style={{ display: "flex", padding: 0, background: "none", border: "none" }}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </button>
          <span style={{ fontFamily: "var(--font-primary)", fontSize: 18, fontWeight: 700, color: "#FFFFFF" }}>
            Детали
          </span>
          <button style={{ display: "flex", padding: 0, background: "none", border: "none" }}>
            <Share2 size={24} color="#FFFFFF" />
          </button>
        </div>

        {/* Content */}
        <div style={{
          flex: 1, overflowY: "auto", padding: "12px 20px",
          display: "flex", flexDirection: "column", gap: 16,
        }}>
          {/* Image */}
          <div style={{
            width: "100%", aspectRatio: "1", borderRadius: 20, overflow: "hidden",
            border: "1px solid #27272A",
          }}>
            <img src={imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>

          {/* Info cards row */}
          <div style={{ display: "flex", gap: 12 }}>
            {[
              { label: "Модель", value: "Nano" },
              { label: "Формат", value: "1:1" },
              { label: "Создано", value: dateStr },
            ].map((item) => (
              <div key={item.label} style={{
                flex: 1, padding: "12px 16px", borderRadius: 12,
                background: "#18181B", border: "1px solid #27272A",
                display: "flex", flexDirection: "column", gap: 8,
              }}>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "#71717A" }}>
                  {item.label}
                </span>
                <span style={{ fontFamily: "var(--font-primary)", fontSize: 16, fontWeight: 700, color: "#FFFFFF" }}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>

          {/* Prompt */}
          {post.prompt && (
            <div style={{
              padding: "16px 20px", borderRadius: 12, background: "#18181B",
              border: "1px solid #27272A", display: "flex", flexDirection: "column", gap: 8,
            }}>
              <span style={{ fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 600, color: "#A1A1AA" }}>
                Промпт
              </span>
              <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#FFFFFF", lineHeight: 1.5 }}>
                {post.prompt}
              </span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ padding: "12px 20px 32px 20px", display: "flex", flexDirection: "column", gap: 12, flexShrink: 0 }}>
          <button onClick={handleDownload}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              height: 48, borderRadius: 12, background: "#C4F82A", border: "none", width: "100%",
            }}>
            <Download size={18} color="#0A0A0A" />
            <span style={{ fontFamily: "var(--font-primary)", fontSize: 15, fontWeight: 700, color: "#0A0A0A" }}>
              Скачать
            </span>
          </button>
          <button onClick={() => { haptic(); navigate(`/generate/${post.id}`); }}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              height: 48, borderRadius: 12, background: "#18181B",
              border: "1px solid #27272A", width: "100%",
            }}>
            <Sparkles size={18} color="#C4F82A" />
            <span style={{ fontFamily: "var(--font-primary)", fontSize: 15, fontWeight: 700, color: "#FFFFFF" }}>
              Создать похожее
            </span>
          </button>
          <button onClick={() => { haptic(); navigate("/animate"); }}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              height: 48, borderRadius: 12, background: "#18181B",
              border: "1px solid #27272A", width: "100%",
            }}>
            <Play size={18} color="#C4F82A" />
            <span style={{ fontFamily: "var(--font-primary)", fontSize: 15, fontWeight: 700, color: "#FFFFFF" }}>
              Оживить
            </span>
          </button>
        </div>
      </Layout>
    );
  }

  /* ─── Desktop Layout ─── */
  return (
    <Layout>
      <div style={{ display: "flex", gap: 40, padding: "32px 0" }}>
        {/* Image column */}
        <div style={{
          width: 560, height: 560, borderRadius: 20, overflow: "hidden",
          border: "1px solid #27272A", flexShrink: 0,
        }}>
          <img src={imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>

        {/* Info column */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Back link */}
          <button onClick={() => navigate(-1)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "none", border: "none", padding: 0,
            }}>
            <ArrowLeft size={20} color="#71717A" />
            <span style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "#71717A" }}>
              Назад к галерее
            </span>
          </button>

          {/* Title */}
          <span style={{ fontFamily: "var(--font-primary)", fontSize: 24, fontWeight: 700, color: "#FFFFFF" }}>
            {post.prompt || "Без описания"}
          </span>

          {/* Info cards */}
          <div style={{ display: "flex", gap: 12 }}>
            {[
              { label: "Модель", value: "Nano" },
              { label: "Формат", value: "1:1" },
              { label: "Создано", value: dateStr },
            ].map((item) => (
              <div key={item.label} style={{
                padding: "12px 16px", borderRadius: 12, background: "#18181B",
                border: "1px solid #27272A", display: "flex", flexDirection: "column", gap: 8,
              }}>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "#71717A" }}>
                  {item.label}
                </span>
                <span style={{ fontFamily: "var(--font-primary)", fontSize: 16, fontWeight: 700, color: "#FFFFFF" }}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button onClick={handleDownload}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "14px 24px", borderRadius: 12, background: "#C4F82A",
                border: "none", width: "100%",
              }}>
              <Download size={18} color="#0A0A0A" />
              <span style={{ fontFamily: "var(--font-primary)", fontSize: 15, fontWeight: 700, color: "#0A0A0A" }}>
                Скачать
              </span>
            </button>
            <button onClick={() => { haptic(); navigate(`/generate/${post.id}`); }}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "14px 24px", borderRadius: 12, background: "#18181B",
                border: "1px solid #27272A", width: "100%",
              }}>
              <Sparkles size={18} color="#C4F82A" />
              <span style={{ fontFamily: "var(--font-primary)", fontSize: 15, fontWeight: 700, color: "#FFFFFF" }}>
                Создать похожее
              </span>
            </button>
            <button onClick={() => { haptic(); navigate("/animate"); }}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "14px 24px", borderRadius: 12, background: "#18181B",
                border: "1px solid #27272A", width: "100%",
              }}>
              <Play size={18} color="#C4F82A" />
              <span style={{ fontFamily: "var(--font-primary)", fontSize: 15, fontWeight: 700, color: "#FFFFFF" }}>
                Оживить
              </span>
            </button>
          </div>

          {/* Similar works */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <span style={{ fontFamily: "var(--font-primary)", fontSize: 18, fontWeight: 700, color: "#FFFFFF" }}>
              Похожие работы
            </span>
            <div style={{ display: "flex", gap: 12 }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} style={{
                  width: 120, height: 120, borderRadius: 12, background: "#18181B",
                  border: "1px solid #27272A",
                }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
