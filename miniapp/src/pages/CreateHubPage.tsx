import { useNavigate } from "react-router-dom";
import { Image, Video, Clapperboard, Sparkles, ChevronRight, ArrowLeft } from "lucide-react";
import { Layout } from "../components/Layout";
import { useIsDesktop } from "../hooks/useMediaQuery";
import { haptic } from "../telegram";

const cards = [
  {
    title: "Создать фото",
    subtitle: "AI генерация фото по промпту",
    icon: Image,
    path: "/create/photo",
  },
  {
    title: "Создать видео",
    subtitle: "Генерация видео из текста",
    icon: Video,
    path: "/create/video",
  },
  {
    title: "Создать Reels",
    subtitle: "Видео из готовых шаблонов",
    icon: Clapperboard,
    path: "/create/reels",
  },
  {
    title: "Оживить фото",
    subtitle: "Анимация статичных фотографий",
    icon: Sparkles,
    path: "/create/animate",
  },
];

export default function CreateHubPage() {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();

  const handleCardClick = (path: string) => {
    haptic("light");
    navigate(path);
  };

  if (isDesktop) {
    return (
      <Layout>
        <div
          style={{
            maxWidth: 800,
            margin: "0 auto",
            padding: "48px 24px",
          }}
        >
          <h1
            style={{
              fontFamily: "var(--font-primary)",
              fontSize: 32,
              fontWeight: 700,
              color: "var(--text)",
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            Создать
          </h1>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 16,
              color: "var(--text-secondary)",
              textAlign: "center",
              marginBottom: 40,
            }}
          >
            Выберите тип контента для генерации
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
            }}
          >
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.path}
                  onClick={() => handleCardClick(card.path)}
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 20,
                    padding: 28,
                    cursor: "pointer",
                    textAlign: "left",
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                    transition: "border-color 0.15s, transform 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor =
                      "var(--accent)";
                    (e.currentTarget as HTMLButtonElement).style.transform =
                      "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor =
                      "var(--border)";
                    (e.currentTarget as HTMLButtonElement).style.transform =
                      "translateY(0)";
                  }}
                >
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 14,
                      background: "#C4F82A20",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon size={28} color="var(--accent)" />
                  </div>
                  <div>
                    <div
                      style={{
                        fontFamily: "var(--font-primary)",
                        fontSize: 18,
                        fontWeight: 600,
                        color: "var(--text)",
                        marginBottom: 6,
                      }}
                    >
                      {card.title}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-body)",
                        fontSize: 14,
                        color: "var(--text-secondary)",
                      }}
                    >
                      {card.subtitle}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showBack showTabBar>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          padding: "16px 20px",
        }}
      >
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.path}
              onClick={() => handleCardClick(card.path)}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 20,
                padding: 20,
                cursor: "pointer",
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                textAlign: "left",
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: "#C4F82A20",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon size={22} color="var(--accent)" />
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontFamily: "var(--font-primary)",
                    fontSize: 16,
                    fontWeight: 600,
                    color: "var(--text)",
                    marginBottom: 4,
                  }}
                >
                  {card.title}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: 13,
                    color: "var(--text-secondary)",
                  }}
                >
                  {card.subtitle}
                </div>
              </div>
              <ChevronRight size={18} color="var(--text-muted)" />
            </button>
          );
        })}
      </div>
    </Layout>
  );
}
