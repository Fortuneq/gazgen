import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Layout } from "../components/Layout";
import { useIsDesktop } from "../hooks/useMediaQuery";
import { haptic, getTelegram } from "../telegram";
import { api } from "../api";
import { Zap, Coins, ArrowLeft, ExternalLink, CheckCircle, Loader2, CreditCard, Bitcoin } from "lucide-react";

interface SubPlan {
  name: string;
  price: string;
  priceNum: number;
  period: string;
  tokens: string;
  tokensNum: number;
  features: string[];
  highlighted: boolean;
  badge?: string;
}

const PLANS: SubPlan[] = [
  { name: "Старт", price: "299₽", priceNum: 299, period: "/мес", tokens: "50 токенов", tokensNum: 50, features: ["Базовые модели"], highlighted: false },
  { name: "Про", price: "699₽", priceNum: 699, period: "/мес", tokens: "200 токенов", tokensNum: 200, features: ["Все модели", "Приоритет"], highlighted: true, badge: "ХИТ" },
  { name: "Ультра", price: "1490₽", priceNum: 1490, period: "/мес", tokens: "500 токенов", tokensNum: 500, features: ["Все модели", "Приоритет", "4K экспорт"], highlighted: false },
];

interface TokenPack {
  amount: string;
  price: string;
  priceNum: number;
  tokensNum: number;
  highlighted: boolean;
  badge?: string;
}

const TOKEN_PACKS: TokenPack[] = [
  { amount: "50 токенов", price: "199₽", priceNum: 199, tokensNum: 50, highlighted: false },
  { amount: "150 токенов", price: "499₽", priceNum: 499, tokensNum: 150, highlighted: true, badge: "ВЫГОДНО" },
  { amount: "500 токенов", price: "1 490₽", priceNum: 1490, tokensNum: 500, highlighted: false },
];

type ModalType = null | { kind: "plan"; plan: SubPlan } | { kind: "tokens"; pack: TokenPack };

type PaymentMethod = "card" | "crypto";

type PaymentState =
  | { step: "idle" }
  | { step: "creating" }
  | { step: "awaiting"; paymentUrl: string; orderId: string }
  | { step: "success"; tokens: number }
  | { step: "error"; message: string };

function PaymentScreen({ modal, onClose }: { modal: NonNullable<ModalType>; onClose: () => void }) {
  const isDesktop = useIsDesktop();
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [payState, setPayState] = useState<PaymentState>({ step: "idle" });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const planLabel = modal.kind === "plan"
    ? `${modal.plan.name} · подписка`
    : modal.pack.amount;
  const period = modal.kind === "plan" ? "1 месяц" : "Единоразово";
  const tokens = modal.kind === "plan" ? modal.plan.tokens : modal.pack.amount;
  const price = modal.kind === "plan" ? modal.plan.price : modal.pack.price;
  const totalPrice = price.replace("₽", " ₽");
  const priceNum = modal.kind === "plan" ? modal.plan.priceNum : modal.pack.priceNum;
  const tokensNum = modal.kind === "plan" ? modal.plan.tokensNum : modal.pack.tokensNum;
  const productType = modal.kind === "plan" ? "subscription" as const : "token_pack" as const;
  const productName = modal.kind === "plan" ? modal.plan.name : modal.pack.amount;

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const startPolling = useCallback((orderId: string, pm: PaymentMethod) => {
    if (pollRef.current) clearInterval(pollRef.current);
    const statusFn = pm === "card" ? api.getPallyPaymentStatus : api.getPaymentStatus;
    pollRef.current = setInterval(async () => {
      try {
        const status = await statusFn(orderId);
        if (status.status === "paid") {
          if (pollRef.current) clearInterval(pollRef.current);
          haptic("heavy");
          setPayState({ step: "success", tokens: status.tokens });
        }
      } catch {
        // Keep polling
      }
    }, 3000);
  }, []);

  const handlePay = useCallback(async () => {
    haptic("medium");
    setPayState({ step: "creating" });

    try {
      const payData = {
        product_type: productType,
        product_name: productName,
        amount: priceNum,
        tokens: tokensNum,
      };
      const result = method === "card"
        ? await api.createPallyPayment(payData)
        : await api.createPayment(payData);

      setPayState({ step: "awaiting", paymentUrl: result.payment_url, orderId: result.order_id });
      startPolling(result.order_id, method);
    } catch {
      setPayState({ step: "error", message: "Не удалось создать платёж. Попробуйте снова." });
    }
  }, [priceNum, tokensNum, productType, productName, startPolling, method]);

  const openPaymentLink = useCallback(() => {
    if (payState.step !== "awaiting") return;
    haptic("medium");
    const tg = getTelegram();
    if (tg) {
      (tg as any).openLink?.(payState.paymentUrl) ?? window.open(payState.paymentUrl, "_blank");
    } else {
      window.open(payState.paymentUrl, "_blank");
    }
  }, [payState]);

  const switchMethod = useCallback((m: PaymentMethod) => {
    if (payState.step !== "idle") return;
    haptic();
    setMethod(m);
  }, [payState]);

  /* ── Success screen ── */
  if (payState.step === "success") {
    return (
      <Layout showTabBar={false}>
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", flex: 1, padding: "32px 24px", gap: 24,
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: "50%",
            background: "rgba(196, 248, 42, 0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <CheckCircle size={40} color="#C4F82A" />
          </div>
          <span style={{
            fontFamily: "var(--font-primary)", fontSize: 24, fontWeight: 700, color: "#FFFFFF",
            textAlign: "center",
          }}>Оплата прошла!</span>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 700, color: "#C4F82A",
          }}>+{payState.tokens} токенов</span>
          <span style={{
            fontFamily: "var(--font-body)", fontSize: 14, color: "#71717A",
            textAlign: "center", maxWidth: 320,
          }}>
            Токены начислены на ваш баланс. Можете приступать к генерации!
          </span>
          <button onClick={onClose} style={{
            height: 48, borderRadius: 12, width: "100%", maxWidth: 320,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "#C4F82A", border: "none", cursor: "pointer",
          }}>
            <span style={{
              fontFamily: "var(--font-body)", fontSize: 16, fontWeight: 600, color: "#0A0A0A",
            }}>Отлично</span>
          </button>
        </div>
      </Layout>
    );
  }

  const methodTitle = method === "card" ? "Оплата картой / СБП" : "Оплата криптой";
  const methodDesc = method === "card"
    ? "Банковская карта или Система быстрых платежей"
    : "BTC, ETH, USDT и другие криптовалюты";
  const payButtonLabel = method === "card" ? "Оплатить" : "Оплатить криптой";
  const PayIcon = method === "card" ? CreditCard : Bitcoin;

  /* ── Payment card ── */
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
        }}>{methodTitle}</span>
        <span style={{
          fontFamily: "var(--font-body)", fontSize: 14, color: "#71717A",
          textAlign: "center", maxWidth: 380,
        }}>{methodDesc}</span>
      </div>

      {/* Payment method switcher */}
      <div style={{
        display: "flex", gap: 8, padding: isDesktop ? "8px 32px 4px" : "8px 24px 4px",
      }}>
        <button
          onClick={() => switchMethod("card")}
          style={{
            flex: 1, height: 40, borderRadius: 10,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            background: method === "card" ? "#27272A" : "transparent",
            border: method === "card" ? "1px solid #3F3F46" : "1px solid #27272A",
            cursor: payState.step === "idle" ? "pointer" : "default",
            opacity: payState.step !== "idle" && method !== "card" ? 0.4 : 1,
          }}
        >
          <CreditCard size={14} color={method === "card" ? "#C4F82A" : "#71717A"} />
          <span style={{
            fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 600,
            color: method === "card" ? "#FFFFFF" : "#71717A",
          }}>Карта / СБП</span>
        </button>
        <button
          onClick={() => switchMethod("crypto")}
          style={{
            flex: 1, height: 40, borderRadius: 10,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            background: method === "crypto" ? "#27272A" : "transparent",
            border: method === "crypto" ? "1px solid #3F3F46" : "1px solid #27272A",
            cursor: payState.step === "idle" ? "pointer" : "default",
            opacity: payState.step !== "idle" && method !== "crypto" ? 0.4 : 1,
          }}
        >
          <Bitcoin size={14} color={method === "crypto" ? "#C4F82A" : "#71717A"} />
          <span style={{
            fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 600,
            color: method === "crypto" ? "#FFFFFF" : "#71717A",
          }}>Крипто</span>
        </button>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "#27272A", margin: "8px 0" }} />

      {/* Details Section */}
      <div style={{
        display: "flex", flexDirection: "column", gap: 12,
        padding: isDesktop ? "12px 32px 20px" : "12px 24px 20px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "#71717A" }}>Тариф</span>
          <span style={{ fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 600, color: "#FFFFFF" }}>{planLabel}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "#71717A" }}>Период</span>
          <span style={{ fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 600, color: "#FFFFFF" }}>{period}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "#71717A" }}>Токены</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: "#C4F82A" }}>{tokens}</span>
        </div>

        <div style={{ height: 1, background: "#27272A" }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "var(--font-primary)", fontSize: 18, fontWeight: 700, color: "#FFFFFF" }}>Итого</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 700, color: "#FFFFFF" }}>{totalPrice}</span>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "#27272A" }} />

      {/* Action Section */}
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 12, padding: isDesktop ? "20px 32px" : "20px 24px",
      }}>
        {payState.step === "idle" && (
          <button onClick={handlePay} style={{
            height: 48, borderRadius: 12, width: "100%",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            background: "#C4F82A", border: "none", cursor: "pointer",
            transition: "opacity 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
          >
            <PayIcon size={18} color="#0A0A0A" />
            <span style={{ fontFamily: "var(--font-body)", fontSize: 15, fontWeight: 600, color: "#0A0A0A" }}>
              {payButtonLabel}
            </span>
          </button>
        )}

        {payState.step === "creating" && (
          <div style={{
            height: 48, borderRadius: 12, width: "100%",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            background: "#27272A", border: "none",
          }}>
            <Loader2 size={18} color="#71717A" style={{ animation: "spin 1s linear infinite" }} />
            <span style={{ fontFamily: "var(--font-body)", fontSize: 15, fontWeight: 600, color: "#71717A" }}>
              Создаём счёт...
            </span>
          </div>
        )}

        {payState.step === "awaiting" && (
          <>
            <button onClick={openPaymentLink} style={{
              height: 48, borderRadius: 12, width: "100%",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              background: "#C4F82A", border: "none", cursor: "pointer",
              transition: "opacity 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
            >
              <ExternalLink size={18} color="#0A0A0A" />
              <span style={{ fontFamily: "var(--font-body)", fontSize: 15, fontWeight: 600, color: "#0A0A0A" }}>
                Перейти к оплате
              </span>
            </button>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <Loader2 size={14} color="#71717A" style={{ animation: "spin 1s linear infinite" }} />
              <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#71717A" }}>
                Ожидаем подтверждение оплаты...
              </span>
            </div>
          </>
        )}

        {payState.step === "error" && (
          <>
            <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#EF4444" }}>
              {payState.message}
            </span>
            <button onClick={handlePay} style={{
              height: 48, borderRadius: 12, width: "100%",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              background: "#C4F82A", border: "none", cursor: "pointer",
            }}>
              <span style={{ fontFamily: "var(--font-body)", fontSize: 15, fontWeight: 600, color: "#0A0A0A" }}>
                Попробовать снова
              </span>
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <Layout showTabBar={false}>
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center",
        flex: 1, padding: isDesktop ? "32px 0" : "16px 16px 24px",
      }}>
        {paymentCard}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </Layout>
  );
}

export default function SubscriptionPage() {
  const isDesktop = useIsDesktop();
  const location = useLocation();
  const [modal, setModal] = useState<ModalType>(null);
  const [photoCredits, setPhotoCredits] = useState<number | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedPack, setSelectedPack] = useState<string | null>(null);

  useEffect(() => {
    api.getProfile().then((p) => setPhotoCredits(p.photo_credits)).catch(() => {});
  }, []);

  // Auto-open payment modal if navigated with state from PricingPage
  useEffect(() => {
    const state = location.state as { openPlan?: string; openPack?: string } | null;
    if (!state) return;
    if (state.openPlan) {
      const plan = PLANS.find((p) => p.name === state.openPlan);
      if (plan) setModal({ kind: "plan", plan });
    } else if (state.openPack) {
      const pack = TOKEN_PACKS.find((p) => p.amount === state.openPack);
      if (pack) setModal({ kind: "tokens", pack });
    }
  }, [location.state]);

  const openPlan = (plan: SubPlan) => {
    haptic("medium");
    setSelectedPlan(plan.name);
    setSelectedPack(null);
    setModal({ kind: "plan", plan });
  };
  const openTokens = (pack: TokenPack) => {
    haptic("medium");
    setSelectedPack(pack.amount);
    setSelectedPlan(null);
    setModal({ kind: "tokens", pack });
  };

  const handleClose = () => {
    setModal(null);
    // Refresh balance after payment
    api.getProfile().then((p) => setPhotoCredits(p.photo_credits)).catch(() => {});
  };

  if (modal) {
    return <PaymentScreen modal={modal} onClose={handleClose} />;
  }

  const balanceDisplay = photoCredits !== null ? `${photoCredits} токенов` : "...";

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
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700, color: "var(--accent)" }}>{balanceDisplay}</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <span style={{ fontFamily: "var(--font-primary)", fontSize: 22, fontWeight: 700, color: "var(--text)" }}>Подписка</span>
              <div style={{ display: "flex", gap: 16 }}>
                {PLANS.map((plan) => {
                  const isSelected = selectedPlan === plan.name;
                  const hasBorder = isSelected || plan.highlighted;
                  return (
                  <div key={plan.name} onClick={() => { haptic(); setSelectedPlan(plan.name); setSelectedPack(null); }} style={{
                    flex: 1, padding: 24, borderRadius: 12,
                    background: "var(--surface)",
                    border: hasBorder ? "1.5px solid var(--accent)" : "1px solid var(--border)",
                    display: "flex", flexDirection: "column", gap: 16,
                    cursor: "pointer",
                    transition: "transform 0.15s, box-shadow 0.15s, border 0.15s",
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
                    <button onClick={(e) => { e.stopPropagation(); openPlan(plan); }} style={{
                      height: 40, borderRadius: 10, width: "100%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: isSelected || plan.highlighted ? "var(--accent)" : "#27272A",
                      border: "none", cursor: "pointer",
                      transition: "opacity 0.15s, background 0.15s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                    >
                      <span style={{
                        fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 600,
                        color: isSelected || plan.highlighted ? "#0A0A0A" : "var(--text)",
                      }}>Выбрать</span>
                    </button>
                  </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <span style={{ fontFamily: "var(--font-primary)", fontSize: 22, fontWeight: 700, color: "var(--text)" }}>Докупить токены</span>
              <div style={{ display: "flex", gap: 16 }}>
                {TOKEN_PACKS.map((pack) => {
                  const isPackSelected = selectedPack === pack.amount;
                  const hasPackBorder = isPackSelected || pack.highlighted;
                  return (
                  <div key={pack.amount} onClick={() => { haptic(); setSelectedPack(pack.amount); setSelectedPlan(null); }} style={{
                    flex: 1, padding: 24, borderRadius: 12,
                    background: "var(--surface)",
                    border: hasPackBorder ? "1.5px solid var(--accent)" : "1px solid var(--border)",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
                    cursor: "pointer",
                    transition: "transform 0.15s, box-shadow 0.15s, border 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(196,248,42,0.1)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
                  >
                    <Coins size={28} color={hasPackBorder ? "var(--accent)" : "var(--text-muted)"} />
                    <span style={{ fontFamily: "var(--font-body)", fontSize: 16, fontWeight: 600, color: "var(--text)" }}>{pack.amount}</span>
                    {pack.badge && (
                      <div style={{ padding: "2px 8px", borderRadius: 4, background: "var(--accent)" }}>
                        <span style={{ fontFamily: "var(--font-primary)", fontSize: 10, fontWeight: 700, color: "#0A0A0A" }}>{pack.badge}</span>
                      </div>
                    )}
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 700, color: hasPackBorder ? "var(--accent)" : "var(--text)" }}>{pack.price}</span>
                    <button onClick={(e) => { e.stopPropagation(); openTokens(pack); }} style={{
                      height: 40, borderRadius: 10, width: "100%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: hasPackBorder ? "var(--accent)" : "#27272A",
                      border: "none", cursor: "pointer",
                      transition: "opacity 0.15s, background 0.15s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                    >
                      <span style={{
                        fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 600,
                        color: hasPackBorder ? "#0A0A0A" : "var(--text)",
                      }}>Купить</span>
                    </button>
                  </div>
                  );
                })}
              </div>
            </div>

            <span style={{
              fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-muted)",
              textAlign: "center", alignSelf: "center", maxWidth: 500,
            }}>
              Оплата картой, СБП или криптовалютой.
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
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 700, color: "var(--text)" }}>{balanceDisplay}</span>
            <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--text-muted)", lineHeight: 1.4 }}>
              Токены расходуются на генерацию фото и видео
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <span style={{ fontFamily: "var(--font-primary)", fontSize: 16, fontWeight: 600, color: "var(--text)" }}>Подписка</span>
          <div style={{ display: "flex", gap: 8 }}>
            {PLANS.map((plan) => {
              const isSel = selectedPlan === plan.name;
              const hasBrd = isSel || plan.highlighted;
              return (
              <div key={plan.name} onClick={() => { haptic(); setSelectedPlan(plan.name); setSelectedPack(null); }} style={{
                flex: 1, padding: "14px 12px", borderRadius: 16,
                background: "var(--surface)",
                border: hasBrd ? "1.5px solid var(--accent)" : "1px solid var(--border)",
                display: "flex", flexDirection: "column", gap: 10,
                cursor: "pointer",
                transition: "border 0.15s",
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
                <button onClick={(e) => { e.stopPropagation(); openPlan(plan); }} style={{
                  height: 34, borderRadius: 8, width: "100%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: hasBrd ? "var(--accent)" : "#27272A",
                  border: "none", cursor: "pointer",
                  transition: "background 0.15s",
                }}>
                  <span style={{
                    fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 600,
                    color: hasBrd ? "#0A0A0A" : "var(--text)",
                  }}>Выбрать</span>
                </button>
              </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <span style={{ fontFamily: "var(--font-primary)", fontSize: 16, fontWeight: 600, color: "var(--text)" }}>Докупить токены</span>
          {TOKEN_PACKS.map((pack) => {
            const isPkSel = selectedPack === pack.amount;
            const hasPkBrd = isPkSel || pack.highlighted;
            return (
            <div key={pack.amount} onClick={() => { haptic(); setSelectedPack(pack.amount); setSelectedPlan(null); }} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "14px 16px", borderRadius: 12,
              background: "var(--surface)",
              border: hasPkBrd ? "1.5px solid var(--accent)" : "1px solid var(--border)",
              cursor: "pointer",
              transition: "border 0.15s",
            }}>
              <Coins size={18} color={hasPkBrd ? "var(--accent)" : "var(--text-muted)"} />
              <span style={{ fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 500, color: "var(--text)" }}>{pack.amount}</span>
              {pack.badge && (
                <div style={{ padding: "2px 6px", borderRadius: 4, background: "var(--accent)" }}>
                  <span style={{ fontFamily: "var(--font-primary)", fontSize: 9, fontWeight: 700, color: "#0A0A0A" }}>{pack.badge}</span>
                </div>
              )}
              <div style={{ flex: 1 }} />
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700,
                color: hasPkBrd ? "var(--accent)" : "var(--text)",
              }}>{pack.price}</span>
              <button onClick={(e) => { e.stopPropagation(); openTokens(pack); }} style={{
                padding: "6px 14px", borderRadius: 8,
                background: hasPkBrd ? "var(--accent)" : "#27272A",
                border: "none", cursor: "pointer",
                transition: "background 0.15s",
              }}>
                <span style={{
                  fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 600,
                  color: hasPkBrd ? "#0A0A0A" : "var(--text)",
                }}>Купить</span>
              </button>
            </div>
            );
          })}
        </div>

        <div style={{ display: "flex", justifyContent: "center" }}>
          <span style={{
            fontFamily: "var(--font-body)", fontSize: 11, color: "#52525B",
            textAlign: "center", lineHeight: 1.5, maxWidth: 295,
          }}>
            Оплата криптовалютой через CryptoCloud. BTC, ETH, USDT и другие.
          </span>
        </div>
      </div>
    </Layout>
  );
}
