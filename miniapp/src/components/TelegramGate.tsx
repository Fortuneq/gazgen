import { type ReactNode, useState, useEffect, useRef, useCallback } from "react";
import { getTelegram } from "../telegram";
import { useIsDesktop } from "../hooks/useMediaQuery";
import { api } from "../api";

const BOT_USERNAME = "PhotixRobot";

function isInsideTelegram(): boolean {
  const tg = getTelegram();
  if (!tg) return false;
  if (tg.initData) return true;
  if (tg.platform && tg.platform !== "unknown") return true;
  return false;
}

function hasBrowserToken(): boolean {
  return !!localStorage.getItem("auth_token");
}

export function TelegramGate({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState(() => isInsideTelegram() || hasBrowserToken());

  const handleLogin = useCallback(() => {
    setAuthed(true);
  }, []);

  if (authed) return <>{children}</>;
  return <AuthScreen onLogin={handleLogin} />;
}

function AuthScreen({ onLogin }: { onLogin: () => void }) {
  const isDesktop = useIsDesktop();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Telegram Login Widget callback
    (window as any).onTelegramAuth = async (user: any) => {
      setLoading(true);
      setError("");
      try {
        const res = await api.authTelegram(user);
        localStorage.setItem("auth_token", res.token);
        onLogin();
      } catch (e: any) {
        setError("Ошибка авторизации. Попробуйте ещё раз.");
        setLoading(false);
      }
    };

    // Inject Telegram Login Widget script
    if (widgetRef.current && !widgetRef.current.querySelector("iframe")) {
      const script = document.createElement("script");
      script.src = "https://telegram.org/js/telegram-widget.js?22";
      script.async = true;
      script.setAttribute("data-telegram-login", BOT_USERNAME);
      script.setAttribute("data-size", "large");
      script.setAttribute("data-radius", "14");
      script.setAttribute("data-onauth", "onTelegramAuth(user)");
      script.setAttribute("data-request-access", "write");
      widgetRef.current.appendChild(script);
    }

    return () => {
      delete (window as any).onTelegramAuth;
    };
  }, [onLogin]);

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

  const desc = (
    <span style={{
      fontFamily: "'Manrope', sans-serif",
      fontSize: 16, fontWeight: 500, color: "#A1A1AA",
      textAlign: "center",
      width: isDesktop ? 340 : 260,
      lineHeight: 1.5,
    }}>
      Войдите через Telegram, чтобы продолжить
    </span>
  );

  const widget = (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      gap: 16, width: "100%",
    }}>
      {loading ? (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          height: 48,
        }}>
          <div style={{
            width: 24, height: 24,
            border: "3px solid #27272A",
            borderTopColor: "#2AABEE",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }} />
          <span style={{
            fontFamily: "'Manrope', sans-serif",
            fontSize: 14, color: "#A1A1AA",
          }}>Авторизация...</span>
        </div>
      ) : (
        <div ref={widgetRef} style={{
          display: "flex", justifyContent: "center",
          minHeight: 48,
        }} />
      )}
      {error && (
        <span style={{
          fontFamily: "'Manrope', sans-serif",
          fontSize: 13, color: "#EF4444",
          textAlign: "center",
        }}>{error}</span>
      )}
    </div>
  );

  const footer = (
    <span style={{
      fontFamily: "'Manrope', sans-serif",
      fontSize: isDesktop ? 13 : 12,
      color: "#3F3F46",
      textAlign: "center",
      width: isDesktop ? 340 : 260,
    }}>
      Безопасная авторизация через Telegram
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
          gap: 40, padding: 48, width: 480,
          borderRadius: 24, background: "#18181B",
          border: "1px solid #27272A",
        }}>
          {logo}
          {desc}
          {widget}
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
        gap: 36, width: "100%",
      }}>
        {logo}
        {desc}
        {widget}
        {footer}
      </div>
    </div>
  );
}
