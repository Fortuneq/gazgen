import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../../components/Layout";
import { api } from "../../api";
import type { AdminUser } from "../../types";
import { ArrowLeft, Search, Plus, Minus, Coins } from "lucide-react";
import { haptic } from "../../telegram";

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [creditInput, setCreditInput] = useState<{ telegramId: number; amount: string } | null>(null);
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.adminGetUsers({ page, limit, search: search || undefined });
      setUsers(data.items);
      setTotal(data.total);
    } catch { /* empty */ }
    setLoading(false);
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const handleAdjust = async (telegramId: number, amount: number) => {
    const result = await api.adminAdjustCredits(telegramId, amount, "admin");
    haptic();
    setUsers((prev) =>
      prev.map((u) =>
        u.telegram_id === telegramId ? { ...u, photo_credits: result.new_balance } : u
      )
    );
    setCreditInput(null);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <Layout showTabBar={false} title="Пользователи" showBack>
      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
        <button
          onClick={() => { haptic(); navigate("/admin"); }}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          <ArrowLeft size={18} color="#A1A1AA" />
          <span style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "#A1A1AA" }}>Админ-панель</span>
        </button>

        {/* Search */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 14px", borderRadius: 12,
          background: "#18181B", border: "1px solid #27272A",
        }}>
          <Search size={16} color="#71717A" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Имя, username или ID..."
            style={{
              flex: 1, background: "none", border: "none", outline: "none",
              fontFamily: "var(--font-body)", fontSize: 14, color: "#FAFAFA",
            }}
          />
        </div>

        <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#71717A" }}>
          Всего: {total}
        </span>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
            <div style={{
              width: 28, height: 28, border: "3px solid #27272A",
              borderTopColor: "#C4F82A", borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }} />
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {users.map((u) => (
              <div key={u.id} style={{
                padding: "12px 14px", borderRadius: 12,
                background: "#18181B", border: "1px solid #27272A",
                display: "flex", flexDirection: "column", gap: 8,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontFamily: "var(--font-primary)", fontSize: 15, fontWeight: 600, color: "#FAFAFA" }}>
                      {u.first_name || "—"}{u.last_name ? ` ${u.last_name}` : ""}
                    </span>
                    {u.username && (
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#71717A", marginLeft: 8 }}>
                        @{u.username}
                      </span>
                    )}
                  </div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#52525B" }}>
                    {u.telegram_id}
                  </span>
                </div>

                {/* Credits row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Coins size={14} color="#C4F82A" />
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 600, color: "#FAFAFA" }}>
                      {u.photo_credits}
                    </span>
                    <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "#71717A" }}>ткн</span>
                  </div>

                  {creditInput?.telegramId === u.telegram_id ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <input
                        value={creditInput.amount}
                        onChange={(e) => setCreditInput({ ...creditInput, amount: e.target.value })}
                        placeholder="100"
                        style={{
                          width: 60, padding: "6px 8px", borderRadius: 6,
                          background: "#0A0A0A", border: "1px solid #3F3F46",
                          fontFamily: "var(--font-mono)", fontSize: 13, color: "#FAFAFA",
                          textAlign: "center",
                        }}
                      />
                      <button
                        onClick={() => {
                          const val = parseInt(creditInput.amount);
                          if (!isNaN(val) && val !== 0) handleAdjust(u.telegram_id, val);
                        }}
                        style={{
                          padding: "6px 10px", borderRadius: 6,
                          background: "#C4F82A", border: "none", cursor: "pointer",
                          fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 700, color: "#0A0A0A",
                        }}
                      >
                        OK
                      </button>
                      <button
                        onClick={() => setCreditInput(null)}
                        style={{
                          padding: "6px 8px", borderRadius: 6,
                          background: "#27272A", border: "none", cursor: "pointer",
                          fontFamily: "var(--font-body)", fontSize: 12, color: "#A1A1AA",
                        }}
                      >
                        X
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => { haptic(); handleAdjust(u.telegram_id, 100); }}
                        style={{
                          display: "flex", alignItems: "center", gap: 2,
                          padding: "6px 10px", borderRadius: 6,
                          background: "#27272A", border: "none", cursor: "pointer",
                        }}
                      >
                        <Plus size={12} color="#C4F82A" />
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#C4F82A" }}>100</span>
                      </button>
                      <button
                        onClick={() => { haptic(); handleAdjust(u.telegram_id, -100); }}
                        style={{
                          display: "flex", alignItems: "center", gap: 2,
                          padding: "6px 10px", borderRadius: 6,
                          background: "#27272A", border: "none", cursor: "pointer",
                        }}
                      >
                        <Minus size={12} color="#EF4444" />
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#EF4444" }}>100</span>
                      </button>
                      <button
                        onClick={() => { haptic(); setCreditInput({ telegramId: u.telegram_id, amount: "" }); }}
                        style={{
                          padding: "6px 10px", borderRadius: 6,
                          background: "#27272A", border: "none", cursor: "pointer",
                          fontFamily: "var(--font-mono)", fontSize: 12, color: "#A1A1AA",
                        }}
                      >
                        ...
                      </button>
                    </div>
                  )}
                </div>

                <span style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "#3F3F46" }}>
                  Активен: {u.last_active_at ? new Date(u.last_active_at).toLocaleDateString("ru-RU") : "—"}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 8, paddingTop: 8 }}>
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              style={{
                padding: "8px 16px", borderRadius: 10,
                background: page <= 1 ? "#18181B" : "#27272A",
                border: "none", cursor: page <= 1 ? "default" : "pointer",
                fontFamily: "var(--font-body)", fontSize: 13, color: page <= 1 ? "#52525B" : "#FAFAFA",
              }}
            >
              Назад
            </button>
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: 13, color: "#A1A1AA",
              display: "flex", alignItems: "center",
            }}>
              {page}/{totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              style={{
                padding: "8px 16px", borderRadius: 10,
                background: page >= totalPages ? "#18181B" : "#27272A",
                border: "none", cursor: page >= totalPages ? "default" : "pointer",
                fontFamily: "var(--font-body)", fontSize: 13, color: page >= totalPages ? "#52525B" : "#FAFAFA",
              }}
            >
              Далее
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
