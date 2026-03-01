import type { ReactNode } from "react";
import { getTelegram } from "../telegram";

export function TelegramGate({ children }: { children: ReactNode }) {
  // If window.Telegram.WebApp exists, we're inside Telegram — render app.
  // initData can be empty in some Telegram clients, so we check the object itself.
  if (getTelegram()) return <>{children}</>;

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 24,
      padding: 32,
      background: "#0A0A0A",
      color: "#FFFFFF",
      fontFamily: "'Manrope', sans-serif",
      textAlign: "center",
    }}>
      {/* Logo */}
      <div style={{
        width: 80, height: 80, borderRadius: 20,
        background: "rgba(196, 248, 42, 0.15)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: 32, fontWeight: 800, color: "#C4F82A",
      }}>
        P
      </div>

      <h1 style={{
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: 24,
        fontWeight: 700,
        margin: 0,
      }}>
        Откройте приложение через Telegram
      </h1>

      <p style={{
        fontSize: 15,
        color: "#A1A1AA",
        maxWidth: 340,
        margin: 0,
        lineHeight: 1.5,
      }}>
        Photix работает как мини-приложение Telegram.
        Нажмите кнопку ниже, чтобы открыть бота.
      </p>

      <a
        href="https://t.me/PhotixRobot"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          marginTop: 8,
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          padding: "14px 32px",
          borderRadius: 100,
          background: "#C4F82A",
          textDecoration: "none",
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 15,
          fontWeight: 700,
          color: "#0A0A0A",
        }}
      >
        Открыть в Telegram
      </a>
    </div>
  );
}
