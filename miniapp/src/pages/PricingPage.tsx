import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { useIsDesktop } from "../hooks/useMediaQuery";
import { haptic } from "../telegram";
import { api } from "../api";
import { Zap, Coins } from "lucide-react";

interface SubPlan {
  name: string;
  price: string;
  tokens: string;
  features: string[];
  highlight: boolean;
  badge?: string;
}

const SUBSCRIPTIONS: SubPlan[] = [
  {
    name: "Старт",
    price: "299₽",
    tokens: "50 токенов",
    features: ["Базовые модели"],
    highlight: false,
  },
  {
    name: "Про",
    price: "699₽",
    tokens: "200 токенов",
    features: ["Все модели", "Приоритет"],
    highlight: true,
    badge: "ХИТ",
  },
  {
    name: "Ультра",
    price: "1 490₽",
    tokens: "500 токенов",
    features: ["Все модели", "Приоритет", "4K экспорт"],
    highlight: false,
  },
];

interface TokenPack {
  tokens: string;
  price: string;
  highlight: boolean;
  badge?: string;
}

const TOKEN_PACKS: TokenPack[] = [
  { tokens: "50 токенов", price: "199₽", highlight: false },
  { tokens: "150 токенов", price: "499₽", highlight: true, badge: "ВЫГОДНО" },
  { tokens: "500 токенов", price: "1 490₽", highlight: false },
];

export default function PricingPage() {
  const isDesktop = useIsDesktop();
  const navigate = useNavigate();
  const [photoCredits, setPhotoCredits] = useState(0);

  useEffect(() => {
    api.getProfile().then((p) => setPhotoCredits(p.photo_credits)).catch(() => {});
  }, []);

  const content = (
    <div style={{
      display: "flex", flexDirection: "column", gap: 24,
      padding: isDesktop ? "32px 80px" : "16px 20px 24px 20px",
      overflowY: "auto", flex: 1,
    }}>
      {/* Subtitle */}
      <span style={{
        fontFamily: "var(--font-body)", fontSize: 14, color: "#71717A",
      }}>
        Выберите план, который подходит вам
      </span>

      {/* Token balance section */}
      <div style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: 16, borderRadius: 16,
        background: "#18181B", border: "1px solid #27272A",
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: "#1A2E05", display: "flex",
          alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Zap size={22} color="#C4F82A" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 700, color: "#FFFFFF",
          }}>
            {photoCredits} токенов
          </span>
          <span style={{
            fontFamily: "var(--font-body)", fontSize: 12, color: "#71717A",
            lineHeight: 1.4,
          }}>
            Токены расходуются на генерацию фото и видео
          </span>
        </div>
      </div>

      {/* Subscriptions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <span style={{
          fontFamily: "var(--font-primary)", fontSize: 16, fontWeight: 600, color: "#FFFFFF",
        }}>Подписка</span>

        <div style={{
          display: "flex", gap: 8,
          ...(isDesktop ? {} : { overflowX: "auto", scrollbarWidth: "none" as const }),
        }}>
          {SUBSCRIPTIONS.map((plan) => (
            <div key={plan.name} style={{
              flex: isDesktop ? 1 : "none",
              width: isDesktop ? undefined : 140,
              flexShrink: 0,
              display: "flex", flexDirection: "column", gap: 10,
              padding: "14px 12px", borderRadius: 16,
              background: "#18181B",
              border: plan.highlight ? "1.5px solid #C4F82A" : "1px solid #27272A",
            }}>
              {/* Name row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{
                  fontFamily: "var(--font-primary)", fontSize: 14, fontWeight: 600, color: "#FFFFFF",
                }}>{plan.name}</span>
                {plan.badge && (
                  <div style={{
                    padding: "3px 8px", borderRadius: 6, background: "#C4F82A",
                  }}>
                    <span style={{
                      fontFamily: "var(--font-primary)", fontSize: 9, fontWeight: 700, color: "#0A0A0A",
                    }}>{plan.badge}</span>
                  </div>
                )}
              </div>

              {/* Price */}
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 700, color: "#FFFFFF",
              }}>{plan.price}</span>
              <span style={{
                fontFamily: "var(--font-body)", fontSize: 11, color: "#71717A",
              }}>/мес</span>

              {/* Divider */}
              <div style={{ height: 1, background: "#27272A", width: "100%" }} />

              {/* Features */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 500, color: "#C4F82A",
                }}>{plan.tokens}</span>
                {plan.features.map((f) => (
                  <span key={f} style={{
                    fontFamily: "var(--font-body)", fontSize: 11, color: "#A1A1AA",
                  }}>{f}</span>
                ))}
              </div>

              {/* Button */}
              <button
                onClick={() => { haptic(); navigate("/subscription"); }}
                style={{
                  height: 34, borderRadius: 8, width: "100%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: plan.highlight ? "#C4F82A" : "#27272A",
                  border: "none", cursor: "pointer",
                }}
              >
                <span style={{
                  fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 600,
                  color: plan.highlight ? "#0A0A0A" : "#FFFFFF",
                }}>Выбрать</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Add-on tokens */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <span style={{
          fontFamily: "var(--font-primary)", fontSize: 16, fontWeight: 600, color: "#FFFFFF",
        }}>Докупить токены</span>

        {TOKEN_PACKS.map((pack) => (
          <button
            key={pack.tokens}
            onClick={() => { haptic(); navigate("/subscription"); }}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "14px 16px", borderRadius: 12,
              background: "#18181B",
              border: pack.highlight ? "1.5px solid #C4F82A" : "1px solid #27272A",
              cursor: "pointer", width: "100%",
              textAlign: "left",
            }}
          >
            <Coins size={18} color={pack.highlight ? "#C4F82A" : "#71717A"} />
            <span style={{
              fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 500, color: "#FFFFFF",
            }}>{pack.tokens}</span>
            {pack.badge && (
              <div style={{
                padding: "2px 6px", borderRadius: 4, background: "#C4F82A",
              }}>
                <span style={{
                  fontFamily: "var(--font-primary)", fontSize: 9, fontWeight: 700, color: "#0A0A0A",
                }}>{pack.badge}</span>
              </div>
            )}
            <div style={{ flex: 1 }} />
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700,
              color: pack.highlight ? "#C4F82A" : "#FFFFFF",
            }}>{pack.price}</span>
          </button>
        ))}
      </div>

      {/* Footer note */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <span style={{
          fontFamily: "var(--font-body)", fontSize: 11, color: "#52525B",
          textAlign: "center", lineHeight: 1.5, maxWidth: 295,
        }}>
          Оплата криптовалютой через CryptoCloud. BTC, ETH, USDT и другие.
        </span>
      </div>
    </div>
  );

  return (
    <Layout title="Тарифы" showBack showTabBar={false}>
      {content}
    </Layout>
  );
}
