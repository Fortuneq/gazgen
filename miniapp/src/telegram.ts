declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  close: () => void;
  initData: string;
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
    showProgress: (leaveActive?: boolean) => void;
    hideProgress: () => void;
  };
  BackButton: {
    isVisible: boolean;
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
  };
  HapticFeedback: {
    impactOccurred: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
    notificationOccurred: (type: "error" | "success" | "warning") => void;
    selectionChanged: () => void;
  };
  initDataUnsafe: {
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      photo_url?: string;
    };
  };
  colorScheme: "light" | "dark";
  themeParams: Record<string, string>;
  viewportHeight: number;
  viewportStableHeight: number;
  isExpanded: boolean;
  platform: string;
}

export function getTelegram(): TelegramWebApp | null {
  return window.Telegram?.WebApp ?? null;
}

export function initTelegram() {
  const tg = getTelegram();
  if (tg) {
    tg.ready();
    tg.expand();
  }
}

export function getUser() {
  // Try Telegram MiniApp first
  const tgUser = getTelegram()?.initDataUnsafe?.user;
  if (tgUser) return tgUser;

  // Fallback: decode JWT from localStorage (browser auth)
  const token = localStorage.getItem("auth_token");
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return {
        id: Number(payload.sub),
        first_name: payload.first_name || "",
        last_name: undefined as string | undefined,
        username: payload.username || undefined,
        photo_url: undefined as string | undefined,
      };
    } catch { /* ignore */ }
  }
  return null;
}

export function getInitData(): string {
  return getTelegram()?.initData ?? "";
}

export function haptic(type: "light" | "medium" | "heavy" = "light") {
  getTelegram()?.HapticFeedback?.impactOccurred(type);
}
