import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Layout } from "../components/Layout";
import { api } from "../api";
import { useIsDesktop } from "../hooks/useMediaQuery";
import { haptic } from "../telegram";
import type { PostDetail } from "../types";
import { Heart, Share2, Sparkles, Play, Download, ArrowLeft, Copy, Check } from "lucide-react";

export default function PhotoDetailPage() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [similarPosts, setSimilarPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!postId) return;
    const id = Number(postId);
    setLoading(true);
    api.getPost(id)
      .then((data) => {
        setPost(data);
        // Try to get similar posts from same category
        if (data.category) {
          api.getPosts({ category: data.category, limit: 8 })
            .then((res) => setSimilarPosts(res.items.filter((p) => p.id !== id).slice(0, 4)))
            .catch(console.error);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [postId]);

  const handleCreateSimilar = useCallback(() => {
    haptic("medium");
    if (postId) navigate(`/generate/${postId}`);
  }, [navigate, postId]);

  const handleAnimate = useCallback(() => {
    haptic("medium");
    navigate("/animate");
  }, [navigate]);

  const handleFavorite = useCallback(() => {
    haptic("medium");
    setIsFavorited((prev) => !prev);
  }, []);

  const handleCopyLink = useCallback(() => {
    haptic();
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  const handleDownload = useCallback(() => {
    haptic("medium");
    if (postId) {
      const link = document.createElement("a");
      link.href = api.getResultImageUrl(Number(postId));
      link.download = `photix-${postId}.png`;
      link.click();
    }
  }, [postId]);

  if (loading || !post) {
    return (
      <Layout showBack showTabBar={false}>
        <div style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div className="animate-spin" style={{
            width: 32, height: 32, border: "3px solid #27272A",
            borderTopColor: "#C4F82A", borderRadius: "50%",
          }} />
        </div>
      </Layout>
    );
  }

  const createdDate = post.created_at
    ? new Date(post.created_at).toLocaleDateString("ru-RU", {
        day: "2-digit", month: "2-digit", year: "numeric",
      })
    : "";

  if (isDesktop) {
    return (
      <Layout showTabBar={false}>
        <div style={{
          display: "flex", gap: 40, padding: "32px 0", minHeight: "calc(100vh - 180px)",
        }}>
          {/* Image Column */}
          <div style={{
            width: 560, height: 560, borderRadius: 20, overflow: "hidden",
            background: "#18181B", border: "1px solid #27272A", flexShrink: 0,
          }}>
            {post.has_result_image && (
              <img
                src={api.getResultImageUrl(post.id)}
                alt={post.prompt || ""}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            )}
          </div>

          {/* Info Column */}
          <div style={{
            flex: 1, display: "flex", flexDirection: "column", gap: 24,
          }}>
            {/* Back Row */}
            <button
              onClick={() => navigate(-1)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "none", border: "none", cursor: "pointer",
                padding: 0, alignSelf: "flex-start",
              }}
            >
              <ArrowLeft size={20} color="#71717A" />
              <span style={{
                fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 500, color: "#71717A",
              }}>Назад к галерее</span>
            </button>

            {/* Title / Prompt */}
            <h1 style={{
              fontFamily: "var(--font-primary)", fontSize: 24, fontWeight: 700,
              color: "#FFFFFF", margin: 0, lineHeight: 1.4,
            }}>
              {post.prompt || "AI-генерация"}
            </h1>

            {/* Meta Info Cards */}
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{
                background: "#18181B", borderRadius: 12, padding: "12px 16px",
                border: "1px solid #27272A", display: "flex", flexDirection: "column", gap: 8,
              }}>
                <span style={{
                  fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 500, color: "#71717A",
                }}>Модель</span>
                <span style={{
                  fontFamily: "var(--font-primary)", fontSize: 16, fontWeight: 700, color: "#FFFFFF",
                }}>Nano Banana</span>
              </div>
              <div style={{
                background: "#18181B", borderRadius: 12, padding: "12px 16px",
                border: "1px solid #27272A", display: "flex", flexDirection: "column", gap: 8,
              }}>
                <span style={{
                  fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 500, color: "#71717A",
                }}>Формат</span>
                <span style={{
                  fontFamily: "var(--font-primary)", fontSize: 16, fontWeight: 700, color: "#FFFFFF",
                }}>1:1</span>
              </div>
              <div style={{
                background: "#18181B", borderRadius: 12, padding: "12px 16px",
                border: "1px solid #27272A", display: "flex", flexDirection: "column", gap: 8,
              }}>
                <span style={{
                  fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 500, color: "#71717A",
                }}>Создано</span>
                <span style={{
                  fontFamily: "var(--font-primary)", fontSize: 16, fontWeight: 700, color: "#FFFFFF",
                }}>{createdDate}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <button
                onClick={handleDownload}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  gap: 8, height: 48, borderRadius: 12,
                  background: "#C4F82A", border: "none", cursor: "pointer",
                  width: "100%",
                }}
              >
                <Download size={18} color="#0A0A0A" />
                <span style={{
                  fontFamily: "var(--font-primary)", fontSize: 15, fontWeight: 700, color: "#0A0A0A",
                }}>Скачать</span>
              </button>
              <button
                onClick={handleCreateSimilar}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  gap: 8, height: 48, borderRadius: 12,
                  background: "#18181B", border: "1px solid #27272A",
                  cursor: "pointer", width: "100%",
                }}
              >
                <Sparkles size={18} color="#C4F82A" />
                <span style={{
                  fontFamily: "var(--font-primary)", fontSize: 15, fontWeight: 700, color: "#FFFFFF",
                }}>Создать похожее</span>
              </button>
              <button
                onClick={handleAnimate}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  gap: 8, height: 48, borderRadius: 12,
                  background: "#18181B", border: "1px solid #27272A",
                  cursor: "pointer", width: "100%",
                }}
              >
                <Play size={18} color="#C4F82A" />
                <span style={{
                  fontFamily: "var(--font-primary)", fontSize: 15, fontWeight: 700, color: "#FFFFFF",
                }}>Оживить</span>
              </button>
            </div>

            {/* Similar Works */}
            {similarPosts.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <span style={{
                  fontFamily: "var(--font-primary)", fontSize: 18, fontWeight: 700, color: "#FFFFFF",
                }}>Похожие работы</span>
                <div style={{ display: "flex", gap: 12 }}>
                  {similarPosts.map((sp) => (
                    <button
                      key={sp.id}
                      onClick={() => { haptic(); navigate(`/photo/${sp.id}`); }}
                      style={{
                        width: 140, height: 140, borderRadius: 12,
                        overflow: "hidden", background: "#18181B",
                        border: "1px solid #27272A", padding: 0,
                        cursor: "pointer", flexShrink: 0,
                      }}
                    >
                      {sp.has_result_image && (
                        <img
                          src={api.getResultImageUrl(sp.id)}
                          alt=""
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                          loading="lazy"
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </Layout>
    );
  }

  // Mobile layout
  return (
    <Layout showTabBar={false} fullScreen>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: 56, padding: "0 20px", flexShrink: 0,
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: "none", border: "none", cursor: "pointer",
            padding: 0, display: "flex",
          }}
        >
          <ArrowLeft size={24} color="#FFFFFF" />
        </button>
        <div style={{ display: "flex", gap: 16 }}>
          <button onClick={handleFavorite} style={{ padding: 0, background: "none", border: "none", cursor: "pointer" }}>
            <Heart size={24} color={isFavorited ? "#C4F82A" : "#FFFFFF"} fill={isFavorited ? "#C4F82A" : "none"} />
          </button>
          <button onClick={handleCopyLink} style={{ padding: 0, background: "none", border: "none", cursor: "pointer" }}>
            {copied ? <Check size={24} color="#C4F82A" /> : <Copy size={24} color="#FFFFFF" />}
          </button>
        </div>
      </div>

      {/* Main Image */}
      <div style={{
        flex: 1, padding: "12px 20px", display: "flex",
        flexDirection: "column", minHeight: 0,
      }}>
        <div style={{
          flex: 1, borderRadius: 20, overflow: "hidden",
          background: "#18181B", border: "1px solid #27272A",
        }}>
          {post.has_result_image && (
            <img
              src={api.getResultImageUrl(post.id)}
              alt={post.prompt || ""}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          )}
        </div>
      </div>

      {/* Author Info */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 20px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "#18181B", border: "1px solid #27272A",
          }} />
          <span style={{
            fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 600, color: "#FFFFFF",
          }}>text2image_soul</span>
        </div>
        <span style={{
          fontFamily: "var(--font-body)", fontSize: 12, color: "#52525B",
        }}>{createdDate}</span>
      </div>

      {/* Action Buttons */}
      <div style={{
        display: "flex", gap: 10, padding: "12px 20px",
      }}>
        <button
          onClick={handleCreateSimilar}
          style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
            gap: 8, height: 52, borderRadius: 16,
            background: "#C4F82A", border: "none", cursor: "pointer",
          }}
        >
          <Sparkles size={20} color="#000000" />
          <span style={{
            fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 600, color: "#000000",
          }}>Создать похожее</span>
        </button>
        <button
          onClick={handleAnimate}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: 8, height: 52, borderRadius: 16, padding: "0 20px",
            background: "#18181B", border: "1px solid #27272A", cursor: "pointer",
          }}
        >
          <Play size={20} color="#C4F82A" />
          <span style={{
            fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 600, color: "#FFFFFF",
          }}>Оживить</span>
        </button>
      </div>

      {/* Model Info */}
      <div style={{ padding: "4px 20px 16px" }}>
        <span style={{
          fontFamily: "var(--font-body)", fontSize: 12, color: "#52525B",
        }}>
          Nano Banana · 1:1 · {createdDate}
        </span>
      </div>
    </Layout>
  );
}
