import { Zap, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const navLinks = [
  { path: "/", label: "Главная" },
  { path: "/create", label: "Создать" },
  { path: "/categories", label: "Примеры" },
  { path: "/pricing", label: "Тарифы" },
] as const;

interface DesktopNavProps {
  credits?: number;
  onCreditsClick?: () => void;
}

export function DesktopNav({ credits = 0, onCreditsClick }: DesktopNavProps) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <header style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      height: 64, padding: "0 32px", width: "100%", flexShrink: 0,
      borderBottom: "1px solid #27272A",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
        <button onClick={() => navigate("/")} style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
          <span style={{ fontFamily: "var(--font-primary)", fontSize: 20, fontWeight: 700, color: "#FFFFFF" }}>
            Photix
          </span>
        </button>
        <nav style={{ display: "flex", gap: 8 }}>
          {navLinks.map((link) => {
            const active = link.path === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(link.path);
            return (
              <button key={link.path} onClick={() => navigate(link.path)}
                style={{
                  padding: "8px 16px", borderRadius: 100, border: "none",
                  background: "transparent", cursor: "pointer",
                  fontFamily: "var(--font-body)", fontSize: 14, fontWeight: active ? 600 : 500,
                  color: active ? "#C4F82A" : "#A1A1AA",
                  textDecoration: active ? "underline" : "none",
                  textUnderlineOffset: 4,
                  transition: "all 0.2s",
                }}>
                {link.label}
              </button>
            );
          })}
        </nav>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={onCreditsClick} style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "#18181B", borderRadius: 100, padding: "8px 16px",
          border: "1px solid #27272A", cursor: "pointer",
        }}>
          <Zap size={14} fill="#C4F82A" color="#C4F82A" />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 500, color: "#C4F82A" }}>
            {credits}
          </span>
        </button>
        <button onClick={() => navigate("/profile")} style={{
          width: 36, height: 36, borderRadius: "50%", background: "#27272A",
          display: "flex", alignItems: "center", justifyContent: "center",
          border: "none", cursor: "pointer",
        }}>
          <User size={18} color="#A1A1AA" />
        </button>
      </div>
    </header>
  );
}
