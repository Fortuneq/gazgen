import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../../components/Layout";
import { api } from "../../api";
import type { StatsOverview, PopularModel, DailyActive, PaymentStats } from "../../types";
import { ArrowLeft } from "lucide-react";
import { haptic } from "../../telegram";

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

export default function AdminStatsPage() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState<StatsOverview | null>(null);
  const [models, setModels] = useState<PopularModel[]>([]);
  const [daily, setDaily] = useState<DailyActive[]>([]);
  const [payments, setPayments] = useState<PaymentStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.adminStatsOverview(),
      api.adminPopularModels(30),
      api.adminDailyActive(30),
      api.adminPaymentStats(30),
    ])
      .then(([o, m, d, p]) => {
        setOverview(o); setModels(m); setDaily(d); setPayments(p);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const maxDau = Math.max(...daily.map((d) => d.users), 1);
  const maxGen = Math.max(...daily.map((d) => d.generations), 1);

  const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);

  if (loading) {
    return (
      <Layout showTabBar={false} title="Статистика" showBack>
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
          <div style={{
            width: 32, height: 32, border: "3px solid #27272A",
            borderTopColor: "#C4F82A", borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout showTabBar={false} title="Статистика" showBack>
      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 20 }}>
        <button
          onClick={() => { haptic(); navigate("/admin"); }}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          <ArrowLeft size={18} color="#A1A1AA" />
          <span style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "#A1A1AA" }}>Админ-панель</span>
        </button>

        {/* Overview cards */}
        {overview && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
            {[
              { label: "Пользователей", value: overview.total_users.toLocaleString("ru-RU"), color: "#A78BFA" },
              { label: "DAU", value: overview.dau.toLocaleString("ru-RU"), color: "#C4F82A" },
              { label: "Фото в базе", value: overview.total_posts.toLocaleString("ru-RU"), color: "#60A5FA" },
              { label: "Генераций", value: overview.total_generations.toLocaleString("ru-RU"), color: "#F472B6" },
              { label: "Выручка", value: `${overview.total_revenue.toLocaleString("ru-RU")} ₽`, color: "#FBBF24" },
            ].map((s) => (
              <div key={s.label} style={{
                padding: "14px 16px", borderRadius: 14,
                background: "#18181B", border: "1px solid #27272A",
                display: "flex", flexDirection: "column", gap: 4,
              }}>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "#71717A" }}>{s.label}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 700, color: s.color }}>
                  {s.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Popular models */}
        {models.length > 0 && (
          <div>
            <span style={{ fontFamily: "var(--font-primary)", fontSize: 16, fontWeight: 700, color: "#FAFAFA" }}>
              Популярные модели (30д)
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
              {models.map((m, i) => {
                const maxCount = models[0]?.count || 1;
                const pct = (m.count / maxCount) * 100;
                return (
                  <div key={m.model} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#52525B", width: 20, textAlign: "right" }}>
                      {i + 1}
                    </span>
                    <div style={{ flex: 1, position: "relative", height: 28, borderRadius: 6, overflow: "hidden", background: "#18181B" }}>
                      <div style={{
                        position: "absolute", left: 0, top: 0, bottom: 0,
                        width: `${pct}%`, background: "#C4F82A18", borderRadius: 6,
                      }} />
                      <div style={{
                        position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "0 10px", height: "100%",
                      }}>
                        <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#FAFAFA" }}>
                          {MODEL_NAMES[m.model] || m.model}
                        </span>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#A1A1AA" }}>
                          {m.count}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* DAU chart (simple bar) */}
        {daily.length > 0 && (
          <div>
            <span style={{ fontFamily: "var(--font-primary)", fontSize: 16, fontWeight: 700, color: "#FAFAFA" }}>
              DAU (30д)
            </span>
            <div style={{
              display: "flex", alignItems: "flex-end", gap: 2, height: 100,
              marginTop: 10, padding: "0 4px",
            }}>
              {daily.slice(-30).map((d) => (
                <div
                  key={d.date}
                  title={`${d.date}: ${d.users} users, ${d.generations} gens`}
                  style={{
                    flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                    gap: 1, height: "100%", justifyContent: "flex-end",
                  }}
                >
                  <div style={{
                    width: "100%", borderRadius: "3px 3px 0 0",
                    background: "#C4F82A80",
                    height: `${Math.max((d.users / maxDau) * 100, 2)}%`,
                  }} />
                </div>
              ))}
            </div>
            <div style={{
              display: "flex", justifyContent: "space-between", marginTop: 4,
            }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#52525B" }}>
                {daily[0]?.date ? new Date(daily[0].date).toLocaleDateString("ru-RU", { day: "numeric", month: "short" }) : ""}
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#52525B" }}>
                {daily[daily.length - 1]?.date ? new Date(daily[daily.length - 1].date).toLocaleDateString("ru-RU", { day: "numeric", month: "short" }) : ""}
              </span>
            </div>
          </div>
        )}

        {/* Generations chart */}
        {daily.length > 0 && (
          <div>
            <span style={{ fontFamily: "var(--font-primary)", fontSize: 16, fontWeight: 700, color: "#FAFAFA" }}>
              Генерации/день (30д)
            </span>
            <div style={{
              display: "flex", alignItems: "flex-end", gap: 2, height: 100,
              marginTop: 10, padding: "0 4px",
            }}>
              {daily.slice(-30).map((d) => (
                <div
                  key={d.date}
                  title={`${d.date}: ${d.generations}`}
                  style={{
                    flex: 1, height: "100%", display: "flex",
                    flexDirection: "column", justifyContent: "flex-end",
                  }}
                >
                  <div style={{
                    width: "100%", borderRadius: "3px 3px 0 0",
                    background: "#60A5FA80",
                    height: `${Math.max((d.generations / maxGen) * 100, 2)}%`,
                  }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment summary */}
        {payments.length > 0 && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontFamily: "var(--font-primary)", fontSize: 16, fontWeight: 700, color: "#FAFAFA" }}>
                Платежи (30д)
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: "#FBBF24" }}>
                {totalPayments.toLocaleString("ru-RU")} ₽
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 10 }}>
              {payments.map((p) => (
                <div key={p.date} style={{
                  display: "flex", justifyContent: "space-between",
                  padding: "6px 0", borderBottom: "1px solid #18181B",
                }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "#A1A1AA" }}>
                    {new Date(p.date).toLocaleDateString("ru-RU")}
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "#FAFAFA" }}>
                    {p.amount.toLocaleString("ru-RU")} ₽ ({p.count})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
