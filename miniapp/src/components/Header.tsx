import { ArrowLeft, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  showCredits?: boolean;
  credits?: number;
  rightAction?: React.ReactNode;
  onCreditsClick?: () => void;
}

export function Header({ title, showBack = false, showCredits = false, credits = 0, rightAction, onCreditsClick }: HeaderProps) {
  const navigate = useNavigate();

  // Logo header (Home screen style)
  if (!title && !showBack) {
    return (
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: 62, padding: "0 20px", width: "100%", flexShrink: 0,
      }}>
        <span style={{ fontFamily: "var(--font-primary)", fontSize: 24, fontWeight: 800, color: "#FFFFFF" }}>
          Photix
        </span>
        {showCredits && (
          <button onClick={onCreditsClick} style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "#18181B", borderRadius: 100, padding: "6px 14px",
            border: "1px solid #27272A",
          }}>
            <Zap size={14} fill="#C4F82A" color="#C4F82A" />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 500, color: "#C4F82A" }}>
              {credits}
            </span>
          </button>
        )}
      </header>
    );
  }

  // Title header with back button
  return (
    <header style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      height: 56, padding: "0 20px", width: "100%", position: "relative", flexShrink: 0,
    }}>
      {showBack && (
        <button onClick={() => navigate(-1)} style={{
          position: "absolute", left: 20, top: "50%", transform: "translateY(-50%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 32, height: 32, padding: 0,
        }}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </button>
      )}
      {title && (
        <span style={{ fontFamily: "var(--font-primary)", fontSize: 18, fontWeight: 600, color: "#FFFFFF" }}>
          {title}
        </span>
      )}
      {rightAction && (
        <div style={{ position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)" }}>
          {rightAction}
        </div>
      )}
    </header>
  );
}
