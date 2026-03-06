import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { useIsDesktop } from "../hooks/useMediaQuery";
import { haptic, getUser } from "../telegram";
import { api } from "../api";
import { Coins, Sparkles, LogOut } from "lucide-react";

export default function ProfilePage() {
  const isDesktop = useIsDesktop();
  const navigate = useNavigate();
  const user = getUser();
  const [photoCredits, setPhotoCredits] = useState(0);

  useEffect(() => {
    api.getProfile().then((p) => {
      setPhotoCredits(p.photo_credits);
    }).catch(() => {});
  }, []);

  const initials = user
    ? (user.first_name?.[0] ?? "") + (user.last_name?.[0] ?? "")
    : "?";
  const displayName = user?.first_name ?? "Пользователь";
  const handle = user?.username ? `@${user.username}` : "";

  const isBrowser = !window.Telegram?.WebApp?.initData;
  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    window.location.reload();
  };

  const emptyState = (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: isDesktop ? 24 : 20,
      padding: isDesktop ? "64px 40px" : "48px 20px",
      flex: 1,
    }}>
      <Sparkles size={isDesktop ? 48 : 40} color="#27272A" />
      <span style={{
        fontFamily: "var(--font-primary)",
        fontSize: isDesktop ? 20 : 17, fontWeight: 700,
        color: "var(--text-secondary)", textAlign: "center",
      }}>
        Здесь будут ваши работы
      </span>
      <button
        onClick={() => { haptic(); navigate("/create"); }}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          padding: isDesktop ? "14px 32px" : "14px 28px",
          borderRadius: 14, background: "#C4F82A",
          border: "none", cursor: "pointer",
        }}
      >
        <Sparkles size={18} color="#0A0A0A" />
        <span style={{
          fontFamily: "var(--font-primary)",
          fontSize: isDesktop ? 15 : 14, fontWeight: 700, color: "#0A0A0A",
        }}>
          Создадим что-то великое
        </span>
      </button>
    </div>
  );

  // DESKTOP
  if (isDesktop) {
    return (
      <Layout showTabBar={false}>
        <div style={{ padding: "32px 80px", display: "flex", flexDirection: "column", gap: 32 }}>
          {/* Profile header */}
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div style={{
              width: 80, height: 80, borderRadius: 100,
              background: "var(--surface)", border: "2px solid var(--accent)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontFamily: "var(--font-primary)", fontSize: 28, fontWeight: 700, color: "var(--accent)" }}>{initials}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontFamily: "var(--font-primary)", fontSize: 24, fontWeight: 700, color: "var(--text)" }}>{displayName}</span>
              <span style={{ fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 500, color: "var(--text-muted)" }}>{handle}</span>
            </div>
          </div>

          {/* Balance card */}
          <div style={{
            display: "flex", alignItems: "center", gap: 24,
            padding: "16px 24px", borderRadius: 16,
            background: "var(--surface)", border: "1px solid var(--border)",
          }}>
            <span style={{ fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 500, color: "var(--text-muted)" }}>Баланс:</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Coins size={18} color="var(--accent)" />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{photoCredits} токенов</span>
            </div>
            <button onClick={() => navigate("/subscription")}
              style={{
                padding: "10px 20px", borderRadius: 12,
                background: "var(--accent)", border: "none", cursor: "pointer",
              }}>
              <span style={{ fontFamily: "var(--font-primary)", fontSize: 13, fontWeight: 700, color: "#0A0A0A" }}>Купить ещё</span>
            </button>
          </div>

          {isBrowser && (
            <button onClick={handleLogout} style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "12px 24px", borderRadius: 12, width: "fit-content",
              background: "transparent", border: "1px solid #27272A", cursor: "pointer",
            }}>
              <LogOut size={16} color="#EF4444" />
              <span style={{ fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 600, color: "#EF4444" }}>Выйти</span>
            </button>
          )}

          {emptyState}
        </div>
      </Layout>
    );
  }

  // MOBILE
  return (
    <Layout showTabBar>
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "16px 20px", gap: 16,
      }}>
        {/* Avatar */}
        <div style={{
          width: 72, height: 72, borderRadius: 36,
          background: "var(--surface)", border: "2px solid var(--accent)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontFamily: "var(--font-primary)", fontSize: 24, fontWeight: 700, color: "var(--accent)" }}>{initials}</span>
        </div>
        <span style={{ fontFamily: "var(--font-primary)", fontSize: 20, fontWeight: 700, color: "var(--text)" }}>{displayName}</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "#52525B" }}>{handle}</span>

        {/* Balance row */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 20px", borderRadius: 16, width: "100%",
          background: "var(--surface)", border: "1px solid var(--border)",
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 500, color: "#52525B" }}>Баланс</span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Coins size={14} color="var(--accent)" />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 500, color: "var(--text)" }}>{photoCredits} токенов</span>
            </div>
          </div>
          <button onClick={() => navigate("/subscription")}
            style={{
              padding: "8px 14px", borderRadius: 10,
              background: "var(--accent)", border: "none", cursor: "pointer",
            }}>
            <span style={{ fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 700, color: "#0A0A0A" }}>Купить</span>
          </button>
        </div>

        {isBrowser && (
          <button onClick={handleLogout} style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "12px 0", borderRadius: 12, width: "100%",
            background: "transparent", border: "1px solid #27272A", cursor: "pointer",
          }}>
            <LogOut size={16} color="#EF4444" />
            <span style={{ fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 600, color: "#EF4444" }}>Выйти</span>
          </button>
        )}
      </div>

      {emptyState}
    </Layout>
  );
}
