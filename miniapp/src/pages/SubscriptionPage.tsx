import { useState, useEffect, useCallback } from "react";
import { Layout } from "../components/Layout";
import { useIsDesktop } from "../hooks/useMediaQuery";
import { haptic } from "../telegram";
import { Zap, Coins, CreditCard, ArrowLeft, Timer } from "lucide-react";

interface SubPlan {
  name: string;
  price: string;
  period: string;
  tokens: string;
  features: string[];
  highlighted: boolean;
  badge?: string;
}

const PLANS: SubPlan[] = [
  { name: "Старт", price: "299₽", period: "/мес", tokens: "50 токенов", features: ["Базовые модели"], highlighted: false },
  { name: "Про", price: "699₽", period: "/мес", tokens: "200 токенов", features: ["Все модели", "Приоритет"], highlighted: true, badge: "ХИТ" },
  { name: "Ультра", price: "1490₽", period: "/мес", tokens: "500 токенов", features: ["Все модели", "Приоритет", "4K экспорт"], highlighted: false },
];

interface TokenPack {
  amount: string;
  price: string;
  highlighted: boolean;
  badge?: string;
}

const TOKEN_PACKS: TokenPack[] = [
  { amount: "50 токенов", price: "199₽", highlighted: false },
  { amount: "150 токенов", price: "499₽", highlighted: true, badge: "ВЫГОДНО" },
  { amount: "500 токенов", price: "1 490₽", highlighted: false },
];

type ModalType = null | { kind: "plan"; plan: SubPlan } | { kind: "tokens"; pack: TokenPack };

/* ── Payment QR Screen (matches design frame KQ2dL) ── */

function useCountdown(seconds: number) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function PaymentScreen({ modal, onClose }: { modal: NonNullable<ModalType>; onClose: () => void }) {
  const isDesktop = useIsDesktop();
  const timer = useCountdown(600);

  const planLabel = modal.kind === "plan"
    ? `${modal.plan.name} · подписка`
    : modal.pack.amount;
  const period = modal.kind === "plan" ? "1 месяц" : "Единоразово";
  const tokens = modal.kind === "plan" ? modal.plan.tokens : modal.pack.amount;
  const price = modal.kind === "plan" ? modal.plan.price : modal.pack.price;
  // Price for display in total — strip ₽ to reformat with space
  const totalPrice = price.replace("₽", " ₽");

  const handleCardPay = useCallback(() => {
    haptic("medium");
    // TODO: Integrate real payment
  }, []);

  /* ── Shared payment card ── */
  const paymentCard = (
    <div style={{
      borderRadius: 20, background: "#18181B",
      border: "1px solid #27272A", overflow: "hidden",
      width: isDesktop ? 480 : "100%",
      display: "flex", flexDirection: "column",
    }}>
      {/* Card Header */}
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 6, padding: isDesktop ? "20px 32px 12px" : "20px 24px 12px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", marginBottom: 4 }}>
          <button onClick={onClose} style={{
            padding: 0, background: "none", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center",
          }}>
            <ArrowLeft size={20} color="#A1A1AA" />
          </button>
        </div>
        <span style={{
          fontFamily: "var(--font-primary)", fontSize: 24, fontWeight: 700, color: "#FFFFFF",
        }}>Оплата</span>
        <span style={{
          fontFamily: "var(--font-body)", fontSize: 14, color: "#71717A",
          textAlign: "center", maxWidth: 380,
        }}>Отсканируйте QR-код для оплаты через СберБанк</span>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "#27272A" }} />

      {/* QR Section */}
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 14, padding: isDesktop ? "20px 32px" : "20px 24px",
      }}>
        {/* QR Code placeholder */}
        <div style={{
          width: isDesktop ? 220 : 200, height: isDesktop ? 220 : 200,
          borderRadius: 12, background: "#FFFFFF",
          border: "2px solid #21A038", padding: 10,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            width: "100%", height: "100%", borderRadius: 4,
            background: "#F0F0F0",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="140" height="140" viewBox="0 0 140 140">
              {/* Simple QR-code-like pattern */}
              {Array.from({ length: 14 }, (_, r) =>
                Array.from({ length: 14 }, (_, c) => {
                  const isCorner = (r < 3 && c < 3) || (r < 3 && c > 10) || (r > 10 && c < 3);
                  const show = isCorner || Math.random() > 0.45;
                  return show ? (
                    <rect key={`${r}-${c}`} x={c * 10} y={r * 10} width={9} height={9} rx={1} fill="#000" />
                  ) : null;
                })
              )}
            </svg>
          </div>
        </div>

        {/* SberPay brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 20, height: 20, borderRadius: "50%", background: "#21A038",
          }} />
          <span style={{
            fontFamily: "var(--font-primary)", fontSize: 16, fontWeight: 600, color: "#FFFFFF",
          }}>SberPay</span>
        </div>

        {/* Timer */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Timer size={16} color="#71717A" />
          <span style={{
            fontFamily: "var(--font-body)", fontSize: 13, color: "#71717A",
          }}>QR-код действителен {timer}</span>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "#27272A" }} />

      {/* Details Section */}
      <div style={{
        display: "flex", flexDirection: "column", gap: 12,
        padding: isDesktop ? "14px 32px 16px" : "14px 24px 16px",
      }}>
        {/* Row 1: Тариф */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "#71717A" }}>Тариф</span>
          <span style={{ fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 600, color: "#FFFFFF" }}>{planLabel}</span>
        </div>
        {/* Row 2: Период */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "#71717A" }}>Период</span>
          <span style={{ fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 600, color: "#FFFFFF" }}>{period}</span>
        </div>
        {/* Row 3: Токены */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "#71717A" }}>Токены</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: "#C4F82A" }}>{tokens}</span>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "#27272A" }} />

        {/* Total row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "var(--font-primary)", fontSize: 18, fontWeight: 700, color: "#FFFFFF" }}>Итого</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 700, color: "#FFFFFF" }}>{totalPrice}</span>
        </div>
      </div>

      {/* Bottom: Card payment option */}
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 10, padding: isDesktop ? "12px 32px 20px" : "12px 24px 20px",
      }}>
        <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#71717A" }}>
          Или оплатите картой
        </span>
        <button onClick={handleCardPay} style={{
          height: 44, borderRadius: 10, width: "100%",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          background: "#27272A", border: "none", cursor: "pointer",
          transition: "opacity 0.15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
        >
          <CreditCard size={18} color="#FFFFFF" />
          <span style={{ fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 600, color: "#FFFFFF" }}>
            Оплатить картой
          </span>
        </button>
      </div>
    </div>
  );

  /* ── Desktop: full-page layout ── */
  if (isDesktop) {
    return (
      <Layout showTabBar={false}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          flex: 1, padding: "32px 0",
        }}>
          {paymentCard}
        </div>
      </Layout>
    );
  }

  /* ── Mobile: full-page layout ── */
  return (
    <Layout showTabBar={false}>
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center",
        flex: 1, padding: "16px 16px 24px",
      }}>
        {paymentCard}
      </div>
    </Layout>
  );
}

export default function SubscriptionPage() {
  const isDesktop = useIsDesktop();
  const [modal, setModal] = useState<ModalType>(null);

  const openPlan = (plan: SubPlan) => { haptic("medium"); setModal({ kind: "plan", plan }); };
  const openTokens = (pack: TokenPack) => { haptic("medium"); setModal({ kind: "tokens", pack }); };

  // Payment screen replaces the whole page
  if (modal) {
    return <PaymentScreen modal={modal} onClose={() => setModal(null)} />;
  }

  // DESKTOP
  if (isDesktop) {
    return (
      <Layout showTabBar={false}>
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          padding: "40px 0", gap: 32, flex: 1,
        }}>
          <div style={{ width: 800, display: "flex", flexDirection: "column", gap: 32 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontFamily: "var(--font-primary)", fontSize: 36, fontWeight: 700, color: "var(--text)" }}>Тарифы</span>
              <span style={{ fontFamily: "var(--font-body)", fontSize: 16, color: "var(--text-secondary)" }}>Выберите план, который подходит вам</span>
            </div>

            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "16px 20px", borderRadius: 12,
              background: "var(--surface)", border: "1px solid var(--border)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Coins size={20} color="var(--accent)" />
                <span style={{ fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 500, color: "var(--text-secondary)" }}>Баланс токенов</span>
              </div>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700, color: "var(--accent)" }}>247 токенов</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <span style={{ fontFamily: "var(--font-primary)", fontSize: 22, fontWeight: 700, color: "var(--text)" }}>Подписка</span>
              <div style={{ display: "flex", gap: 16 }}>
                {PLANS.map((plan) => (
                  <div key={plan.name} style={{
                    flex: 1, padding: 24, borderRadius: 12,
                    background: "var(--surface)",
                    border: plan.highlighted ? "1.5px solid var(--accent)" : "1px solid var(--border)",
                    display: "flex", flexDirection: "column", gap: 16,
                    transition: "transform 0.15s, box-shadow 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(196,248,42,0.1)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontFamily: "var(--font-primary)", fontSize: 18, fontWeight: 600, color: "var(--text)" }}>{plan.name}</span>
                      {plan.badge && (
                        <div style={{ padding: "3px 8px", borderRadius: 6, background: "var(--accent)" }}>
                          <span style={{ fontFamily: "var(--font-primary)", fontSize: 10, fontWeight: 700, color: "#0A0A0A" }}>{plan.badge}</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 28, fontWeight: 700, color: "var(--text)" }}>{plan.price}</span>
                      <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-muted)", marginLeft: 4 }}>{plan.period}</span>
                    </div>
                    <div style={{ height: 1, background: "var(--border)" }} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 500, color: "var(--accent)" }}>{plan.tokens}</span>
                      {plan.features.map((f) => (
                        <span key={f} style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-secondary)" }}>✓ {f}</span>
                      ))}
                    </div>
                    <button onClick={() => openPlan(plan)} style={{
                      height: 40, borderRadius: 10, width: "100%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: plan.highlighted ? "var(--accent)" : "#27272A",
                      border: "none", cursor: "pointer",
                      transition: "opacity 0.15s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                    >
                      <span style={{
                        fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 600,
                        color: plan.highlighted ? "#0A0A0A" : "var(--text)",
                      }}>Выбрать</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <span style={{ fontFamily: "var(--font-primary)", fontSize: 22, fontWeight: 700, color: "var(--text)" }}>Докупить токены</span>
              <div style={{ display: "flex", gap: 16 }}>
                {TOKEN_PACKS.map((pack) => (
                  <div key={pack.amount} style={{
                    flex: 1, padding: 24, borderRadius: 12,
                    background: "var(--surface)",
                    border: pack.highlighted ? "1.5px solid var(--accent)" : "1px solid var(--border)",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
                    transition: "transform 0.15s, box-shadow 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(196,248,42,0.1)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
                  >
                    <Coins size={28} color={pack.highlighted ? "var(--accent)" : "var(--text-muted)"} />
                    <span style={{ fontFamily: "var(--font-body)", fontSize: 16, fontWeight: 600, color: "var(--text)" }}>{pack.amount}</span>
                    {pack.badge && (
                      <div style={{ padding: "2px 8px", borderRadius: 4, background: "var(--accent)" }}>
                        <span style={{ fontFamily: "var(--font-primary)", fontSize: 10, fontWeight: 700, color: "#0A0A0A" }}>{pack.badge}</span>
                      </div>
                    )}
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 700, color: pack.highlighted ? "var(--accent)" : "var(--text)" }}>{pack.price}</span>
                    <button onClick={() => openTokens(pack)} style={{
                      height: 40, borderRadius: 10, width: "100%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: pack.highlighted ? "var(--accent)" : "#27272A",
                      border: "none", cursor: "pointer",
                      transition: "opacity 0.15s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                    >
                      <span style={{
                        fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 600,
                        color: pack.highlighted ? "#0A0A0A" : "var(--text)",
                      }}>Купить</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <span style={{
              fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-muted)",
              textAlign: "center", alignSelf: "center", maxWidth: 500,
            }}>
              Подписка продлевается автоматически. Вы можете отменить в любой момент.
            </span>
          </div>
        </div>
      </Layout>
    );
  }

  // MOBILE
  return (
    <Layout title="Тарифы" showBack showTabBar={false}>
      <div style={{
        display: "flex", flexDirection: "column", gap: 24,
        padding: "16px 20px 24px", flex: 1, overflowY: "auto",
      }}>
        <span style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-muted)" }}>
          Выберите план, который подходит вам
        </span>

        <div style={{
          display: "flex", alignItems: "center", gap: 14,
          padding: 16, borderRadius: 16,
          background: "var(--surface)", border: "1px solid var(--border)",
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: "#1A2E05", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Zap size={22} color="var(--accent)" />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 700, color: "var(--text)" }}>47 токенов</span>
            <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--text-muted)", lineHeight: 1.4 }}>
              Токены расходуются на генерацию фото и видео
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <span style={{ fontFamily: "var(--font-primary)", fontSize: 16, fontWeight: 600, color: "var(--text)" }}>Подписка</span>
          <div style={{ display: "flex", gap: 8 }}>
            {PLANS.map((plan) => (
              <div key={plan.name} style={{
                flex: 1, padding: "14px 12px", borderRadius: 16,
                background: "var(--surface)",
                border: plan.highlighted ? "1.5px solid var(--accent)" : "1px solid var(--border)",
                display: "flex", flexDirection: "column", gap: 10,
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: "var(--font-primary)", fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{plan.name}</span>
                  {plan.badge && (
                    <div style={{ padding: "3px 8px", borderRadius: 6, background: "var(--accent)" }}>
                      <span style={{ fontFamily: "var(--font-primary)", fontSize: 9, fontWeight: 700, color: "#0A0A0A" }}>{plan.badge}</span>
                    </div>
                  )}
                </div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: plan.name === "Ультра" ? 18 : 20, fontWeight: 700, color: "var(--text)" }}>{plan.price}</span>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--text-muted)" }}>{plan.period}</span>
                <div style={{ height: 1, background: "var(--border)", width: "100%" }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 500, color: "var(--accent)" }}>{plan.tokens}</span>
                  {plan.features.map((f) => (
                    <span key={f} style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--text-secondary)" }}>✓ {f}</span>
                  ))}
                </div>
                <button onClick={() => openPlan(plan)} style={{
                  height: 34, borderRadius: 8, width: "100%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: plan.highlighted ? "var(--accent)" : "#27272A",
                  border: "none", cursor: "pointer",
                }}>
                  <span style={{
                    fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 600,
                    color: plan.highlighted ? "#0A0A0A" : "var(--text)",
                  }}>Выбрать</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <span style={{ fontFamily: "var(--font-primary)", fontSize: 16, fontWeight: 600, color: "var(--text)" }}>Докупить токены</span>
          {TOKEN_PACKS.map((pack) => (
            <div key={pack.amount} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "14px 16px", borderRadius: 12,
              background: "var(--surface)",
              border: pack.highlighted ? "1.5px solid var(--accent)" : "1px solid var(--border)",
            }}>
              <Coins size={18} color={pack.highlighted ? "var(--accent)" : "var(--text-muted)"} />
              <span style={{ fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 500, color: "var(--text)" }}>{pack.amount}</span>
              {pack.badge && (
                <div style={{ padding: "2px 6px", borderRadius: 4, background: "var(--accent)" }}>
                  <span style={{ fontFamily: "var(--font-primary)", fontSize: 9, fontWeight: 700, color: "#0A0A0A" }}>{pack.badge}</span>
                </div>
              )}
              <div style={{ flex: 1 }} />
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700,
                color: pack.highlighted ? "var(--accent)" : "var(--text)",
              }}>{pack.price}</span>
              <button onClick={() => openTokens(pack)} style={{
                padding: "6px 14px", borderRadius: 8,
                background: pack.highlighted ? "var(--accent)" : "#27272A",
                border: "none", cursor: "pointer",
              }}>
                <span style={{
                  fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 600,
                  color: pack.highlighted ? "#0A0A0A" : "var(--text)",
                }}>Купить</span>
              </button>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "center" }}>
          <span style={{
            fontFamily: "var(--font-body)", fontSize: 11, color: "#52525B",
            textAlign: "center", lineHeight: 1.5, maxWidth: 295,
          }}>
            Подписка продлевается автоматически. Отменить можно в любой момент.
          </span>
        </div>
      </div>
    </Layout>
  );
}
