import type { ReactNode } from "react";
import { getTelegram } from "../telegram";
import { useIsDesktop } from "../hooks/useMediaQuery";
import { Send } from "lucide-react";

function isInsideTelegram(): boolean {
  const tg = getTelegram();
  if (!tg) return false;
  // telegram-web-app.js creates window.Telegram.WebApp even in browser,
  // but initData is empty and platform is "unknown" outside Telegram
  if (tg.initData) return true;
  if (tg.platform && tg.platform !== "unknown") return true;
  return false;
}

export function TelegramGate({ children }: { children: ReactNode }) {
  if (isInsideTelegram()) return <>{children}</>;

  return <AuthScreen />;
}

function AuthScreen() {
  const isDesktop = useIsDesktop();

  const logo = (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: isDesktop ? 12 : 16 }}>
      <span style={{
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: isDesktop ? 36 : 32,
        fontWeight: 800,
        color: "#FFFFFF",
      }}>Photix</span>
      <span style={{
        fontFamily: "'Manrope', sans-serif",
        fontSize: 14,
        fontWeight: 500,
        color: "#71717A",
        letterSpacing: 2,
      }}>AI PHOTO GENERATOR</span>
    </div>
  );

  const icon = (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      width: isDesktop ? 96 : 80, height: isDesktop ? 96 : 80,
      borderRadius: isDesktop ? 24 : 20,
      background: "#2AABEE",
    }}>
      <Send size={isDesktop ? 44 : 36} color="#FFFFFF" />
    </div>
  );

  const desc = (
    <span style={{
      fontFamily: "'Manrope', sans-serif",
      fontSize: 16, fontWeight: 500, color: "#A1A1AA",
      textAlign: "center",
      width: isDesktop ? 340 : 260,
      lineHeight: 1.5,
    }}>
      {isDesktop
        ? "Войдите через Telegram, чтобы продолжить"
        : "Войдите через Telegram,\nчтобы продолжить"}
    </span>
  );

  const btn = (
    <a
      href="https://t.me/PhotixRobot/app"
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: 10, height: 56, width: "100%",
        borderRadius: 14, background: "#2AABEE",
        textDecoration: "none",
      }}
    >
      <Send size={20} color="#FFFFFF" />
      <span style={{
        fontFamily: "'Manrope', sans-serif",
        fontSize: 16, fontWeight: 700, color: "#FFFFFF",
      }}>Войти через Telegram</span>
    </a>
  );

  const footer = (
    <span style={{
      fontFamily: "'Manrope', sans-serif",
      fontSize: isDesktop ? 13 : 12,
      color: "#3F3F46",
      textAlign: "center",
      width: isDesktop ? 340 : 260,
    }}>
      Авторизация необходима для использования сервиса
    </span>
  );

  if (isDesktop) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", background: "#0A0A0A",
      }}>
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          gap: 48, padding: 48, width: 480,
          borderRadius: 24, background: "#18181B",
          border: "1px solid #27272A",
        }}>
          {logo}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
            {icon}
            {desc}
          </div>
          {btn}
          {footer}
        </div>
      </div>
    );
  }

  // Mobile
  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "#0A0A0A", padding: "0 40px",
    }}>
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 40, width: "100%",
      }}>
        {logo}
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          gap: 24, width: "100%",
        }}>
          {icon}
          {desc}
          {btn}
        </div>
        {footer}
      </div>
    </div>
  );
}
