import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { GenderFilter } from "../components/GenderFilter";
import { ImageGrid } from "../components/ImageGrid";
import { api } from "../api";
import { useIsDesktop } from "../hooks/useMediaQuery";
import { haptic } from "../telegram";
import type { Post, Tag, Gender } from "../types";
import { Sparkles, Play, ChevronRight, Clapperboard } from "lucide-react";

const GENDER_TO_TAG: Record<Gender, string> = {
  male: "male",
  female: "female",
  unisex: "",
};

export default function HomePage() {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const [gender, setGender] = useState<Gender>("male");
  const [posts, setPosts] = useState<Post[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadData = useCallback(() => {
    const tag = GENDER_TO_TAG[gender] || undefined;
    setLoading(true);
    setError(false);
    Promise.all([
      api.getPosts({ tag, limit: 20 }),
      api.getTags(),
    ]).then(([postsData, tagsData]) => {
      setPosts(postsData.items);
      setTags(tagsData);
    }).catch((err) => {
      console.error(err);
      setError(true);
    }).finally(() => setLoading(false));
  }, [gender]);

  useEffect(() => { loadData(); }, [loadData]);

  const handlePostClick = useCallback((post: Post) => {
    haptic();
    navigate(`/photo/${post.id}`);
  }, [navigate]);

  const handleTagClick = useCallback((name: string) => {
    haptic();
    navigate(`/category/${name}`);
  }, [navigate]);

  if (error) {
    return (
      <Layout>
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", gap: 16, padding: "80px 32px",
          textAlign: "center",
        }}>
          <span style={{
            fontFamily: "var(--font-primary)", fontSize: 18, fontWeight: 700, color: "#FFFFFF",
          }}>Не удалось загрузить данные</span>
          <span style={{
            fontFamily: "var(--font-body)", fontSize: 14, color: "#A1A1AA",
          }}>Проверьте подключение и попробуйте снова</span>
          <button
            onClick={loadData}
            style={{
              marginTop: 8, padding: "12px 28px", borderRadius: 100,
              background: "#C4F82A", border: "none", cursor: "pointer",
              fontFamily: "var(--font-primary)", fontSize: 14, fontWeight: 700, color: "#0A0A0A",
            }}
          >
            Повторить
          </button>
        </div>
      </Layout>
    );
  }

  if (isDesktop) {
    return (
      <Layout>
        {/* Hero Banner */}
        <div style={{
          position: "relative", width: "100%", height: 320, borderRadius: 0,
          overflow: "hidden", background: "#18181B", marginBottom: 0,
        }}>
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to right, #0A0A0AEE 0%, #0A0A0A66 40%, #0A0A0AEE 100%)",
            zIndex: 1,
          }} />
          <div style={{
            position: "absolute", inset: 0, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 20, zIndex: 2,
          }}>
            <h1 style={{
              fontFamily: "var(--font-primary)", fontSize: 48, fontWeight: 800,
              color: "#FFFFFF", textAlign: "center", margin: 0,
            }}>
              Создай свой AI-образ
            </h1>
            <p style={{
              fontFamily: "var(--font-body)", fontSize: 18, fontWeight: 500,
              color: "#A1A1AA", textAlign: "center", margin: 0,
            }}>
              Генерация фото и видео с помощью искусственного интеллекта
            </p>
            <button
              onClick={() => { haptic(); navigate("/create"); }}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "#C4F82A", borderRadius: 100, padding: "14px 32px",
                border: "none", cursor: "pointer",
              }}
            >
              <Sparkles size={18} color="#0A0A0A" />
              <span style={{
                fontFamily: "var(--font-primary)", fontSize: 16, fontWeight: 700, color: "#0A0A0A",
              }}>
                Начать генерацию
              </span>
            </button>
          </div>
        </div>

        {/* Tag Pills + Best Works */}
        <div style={{ padding: "24px 0", display: "flex", flexDirection: "column", gap: 32 }}>
          {/* Tag Row */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={() => {}}
              style={{
                padding: "8px 18px", borderRadius: 100,
                background: "#C4F82A", border: "none", cursor: "pointer",
              }}
            >
              <span style={{
                fontFamily: "var(--font-primary)", fontSize: 13, fontWeight: 700, color: "#0A0A0A",
              }}>Все</span>
            </button>
            {tags.slice(0, 7).map((tag) => (
              <button
                key={tag.name}
                onClick={() => handleTagClick(tag.name)}
                style={{
                  padding: "8px 18px", borderRadius: 100,
                  background: "#18181B", border: "1px solid #27272A",
                  cursor: "pointer",
                }}
              >
                <span style={{
                  fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 500, color: "#A1A1AA",
                }}>{tag.emoji} {tag.display_name}</span>
              </button>
            ))}
          </div>

          {/* Best Works */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{
                fontFamily: "var(--font-primary)", fontSize: 24, fontWeight: 700, color: "#FFFFFF",
              }}>Лучшие работы</span>
              <button
                onClick={() => { haptic(); navigate("/categories"); }}
                style={{ background: "none", border: "none", cursor: "pointer" }}
              >
                <span style={{
                  fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 500, color: "#C4F82A",
                }}>Смотреть все →</span>
              </button>
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              {posts.slice(0, 4).map((post) => (
                <button
                  key={post.id}
                  onClick={() => handlePostClick(post)}
                  style={{
                    flex: 1, height: 240, borderRadius: 16, overflow: "hidden",
                    border: "1px solid #27272A", background: "#18181B", padding: 0,
                    cursor: "pointer", position: "relative",
                  }}
                >
                  {post.has_result_image && (
                    <img
                      src={api.getResultImageUrl(post.id)}
                      alt={post.prompt || ""}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      loading="lazy"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Animate Banner */}
          <div style={{
            position: "relative", width: "100%", height: 160, borderRadius: 20,
            overflow: "hidden", background: "#18181B", border: "1px solid #27272A",
            cursor: "pointer",
          }} onClick={() => { haptic(); navigate("/create/animate"); }}>
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(90deg, #18181B00 0%, #18181B 60%)",
            }} />
            <div style={{
              position: "absolute", left: 440, top: 30,
              display: "flex", flexDirection: "column", gap: 12,
            }}>
              <div style={{
                background: "#C4F82A", borderRadius: 100, padding: "4px 12px",
                alignSelf: "flex-start",
              }}>
                <span style={{
                  fontFamily: "var(--font-primary)", fontSize: 11, fontWeight: 700, color: "#0A0A0A",
                }}>НОВИНКА</span>
              </div>
              <span style={{
                fontFamily: "var(--font-primary)", fontSize: 28, fontWeight: 700, color: "#FFFFFF",
              }}>Оживи своё фото</span>
              <span style={{
                fontFamily: "var(--font-body)", fontSize: 15, fontWeight: 500, color: "#A1A1AA",
              }}>Загрузи фото и получи видео с помощью Kling или Veo моделей</span>
            </div>
            <div style={{
              position: "absolute", right: 40, top: "50%", transform: "translateY(-50%)",
              display: "flex", alignItems: "center", gap: 8,
              background: "#C4F82A", borderRadius: 100, padding: "12px 24px",
            }}>
              <Play size={18} color="#0A0A0A" fill="#0A0A0A" />
              <span style={{
                fontFamily: "var(--font-primary)", fontSize: 14, fontWeight: 700, color: "#0A0A0A",
              }}>Попробовать</span>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Mobile layout
  return (
    <Layout showCredits>
      {/* Gender Filter */}
      <GenderFilter value={gender} onChange={setGender} />

      {/* Featured Tags */}
      <div style={{ padding: "12px 20px", display: "flex", flexDirection: "column", gap: 12, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{
            fontFamily: "var(--font-primary)", fontSize: 20, fontWeight: 700, color: "#FFFFFF",
          }}>Категории</span>
          <button
            onClick={() => { haptic(); navigate("/categories"); }}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            <span style={{
              fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 500, color: "#C4F82A",
            }}>Все</span>
          </button>
        </div>
        <div style={{
          display: "flex", gap: 12, overflowX: "auto",
          scrollbarWidth: "none", msOverflowStyle: "none",
        }}>
          {tags.slice(0, 6).map((tag) => (
            <button
              key={tag.name}
              onClick={() => handleTagClick(tag.name)}
              style={{
                position: "relative", width: 110, height: 120, borderRadius: 16,
                overflow: "hidden", background: "#18181B", border: "1px solid #27272A",
                flexShrink: 0, padding: 0, cursor: "pointer",
              }}
            >
              <img
                src={api.getTagCoverUrl(tag.name)}
                alt={tag.display_name}
                style={{
                  width: "100%", height: "100%", objectFit: "cover",
                  display: "block", position: "absolute", inset: 0,
                }}
                loading="lazy"
              />
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0, height: 50,
                background: "linear-gradient(to bottom, #0A0A0A00, #0A0A0ACC)",
              }} />
              <span style={{
                position: "absolute", left: 10, bottom: 10,
                fontFamily: "var(--font-primary)", fontSize: 13, fontWeight: 700, color: "#FFFFFF",
              }}>{tag.emoji} {tag.display_name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Promo Cards: Animate + Reels */}
      <div style={{ display: "flex", gap: 10, padding: "0 20px" }}>
        {/* Animate Card */}
        <button
          onClick={() => { haptic(); navigate("/create/animate"); }}
          style={{
            flex: 1, position: "relative", height: 170, borderRadius: 20,
            overflow: "hidden", background: "#18181B", border: "1px solid #27272A",
            padding: 0, cursor: "pointer", textAlign: "left",
          }}
        >
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: 60,
            background: "linear-gradient(to bottom, #0A0A0A00, #0A0A0ADD 40%, #0A0A0AF5)",
          }} />
          <span style={{
            position: "absolute", left: 16, bottom: 40,
            fontFamily: "var(--font-primary)", fontSize: 15, fontWeight: 700, color: "#FFFFFF",
          }}>Оживи фото</span>
          <span style={{
            position: "absolute", left: 16, bottom: 20,
            fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 500, color: "#A1A1AA",
          }}>Загрузи фото → получи видео</span>
          <div style={{
            position: "absolute", right: 20, top: 55,
            width: 32, height: 32, borderRadius: "50%", background: "#C4F82A",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Play size={14} color="#0A0A0A" fill="#0A0A0A" />
          </div>
        </button>

        {/* Reels Card */}
        <button
          onClick={() => { haptic(); navigate("/create/reels"); }}
          style={{
            flex: 1, position: "relative", height: 170, borderRadius: 20,
            overflow: "hidden", background: "#18181B", border: "1px solid #27272A",
            padding: 0, cursor: "pointer", textAlign: "left",
          }}
        >
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to bottom, #C4F82A33, #18181B 70%)",
          }} />
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: 60,
            background: "linear-gradient(to bottom, #18181B00, #18181BEE 50%, #18181B)",
          }} />
          <Clapperboard
            size={28} color="#C4F82A"
            style={{ position: "absolute", left: 14, top: 14 }}
          />
          <span style={{
            position: "absolute", left: 14, bottom: 40,
            fontFamily: "var(--font-primary)", fontSize: 15, fontWeight: 700, color: "#FFFFFF",
          }}>Reels</span>
          <span style={{
            position: "absolute", left: 14, bottom: 20,
            fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 500, color: "#A1A1AA",
          }}>Шаблоны для видео</span>
          <ChevronRight
            size={20} color="#C4F82A"
            style={{ position: "absolute", right: 14, top: 14 }}
          />
        </button>
      </div>

      {/* Discovery Grid */}
      <div style={{ padding: "8px 0", overflow: "hidden" }}>
        <ImageGrid
          posts={posts}
          columns={2}
          gap={8}
          onPostClick={handlePostClick}
        />
      </div>
    </Layout>
  );
}
