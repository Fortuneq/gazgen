import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../../components/Layout";
import { api } from "../../api";
import type { StatsOverview } from "../../types";
import { Image, FolderOpen, Users, BarChart3, ArrowLeft } from "lucide-react";
import { haptic } from "../../telegram";

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<StatsOverview | null>(null);

  useEffect(() => {
    api.adminStatsOverview().then(setStats).catch(() => {});
  }, []);

  const cards = [
    { label: "Фото", icon: Image, path: "/admin/photos", color: "#C4F82A" },
    { label: "Категории", icon: FolderOpen, path: "/admin/categories", color: "#60A5FA" },
    { label: "Пользователи", icon: Users, path: "/admin/users", color: "#A78BFA" },
    { label: "Статистика", icon: BarChart3, path: "/admin/stats", color: "#F472B6" },
  ];

  return (
    <Layout showTabBar={false} title="Админ-панель" showBack>
      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Back button */}
        <button
          onClick={() => { haptic(); navigate("/profile"); }}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "none", border: "none", cursor: "pointer", padding: 0,
          }}
        >
          <ArrowLeft size={18} color="#A1A1AA" />
          <span style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "#A1A1AA" }}>Профиль</span>
        </button>

        {/* Stats overview */}
        {stats && (
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10,
          }}>
            {[
              { label: "Пользователей", value: stats.total_users },
              { label: "DAU", value: stats.dau },
              { label: "Фото", value: stats.total_posts },
              { label: "Генераций", value: stats.total_generations },
            ].map((s) => (
              <div key={s.label} style={{
                padding: "14px 16px", borderRadius: 14,
                background: "#18181B", border: "1px solid #27272A",
                display: "flex", flexDirection: "column", gap: 4,
              }}>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "#71717A" }}>{s.label}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 700, color: "#FAFAFA" }}>
                  {s.value.toLocaleString("ru-RU")}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Nav cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {cards.map((c) => (
            <button
              key={c.path}
              onClick={() => { haptic(); navigate(c.path); }}
              style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "16px 18px", borderRadius: 14,
                background: "#18181B", border: "1px solid #27272A",
                cursor: "pointer", width: "100%", textAlign: "left",
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: `${c.color}18`, display: "flex",
                alignItems: "center", justifyContent: "center",
              }}>
                <c.icon size={20} color={c.color} />
              </div>
              <span style={{ fontFamily: "var(--font-primary)", fontSize: 16, fontWeight: 600, color: "#FAFAFA" }}>
                {c.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </Layout>
  );
}
