import { ReactNode, useState, useEffect } from "react";
import { Header } from "./Header";
import { TabBar } from "./TabBar";
import { DesktopNav } from "./DesktopNav";
import { Footer } from "./Footer";
import { useIsDesktop } from "../hooks/useMediaQuery";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

interface LayoutProps {
  children: ReactNode;
  title?: string;
  showBack?: boolean;
  showTabBar?: boolean;
  showCredits?: boolean;
  credits?: number;
  headerRight?: ReactNode;
  fullScreen?: boolean;
}

export function Layout({
  children, title, showBack = false, showTabBar = true,
  showCredits = true, credits: creditsProp, headerRight, fullScreen = false,
}: LayoutProps) {
  const isDesktop = useIsDesktop();
  const navigate = useNavigate();
  const [realCredits, setRealCredits] = useState<number | null>(creditsProp ?? null);

  useEffect(() => {
    if (creditsProp !== undefined) return;
    api.getProfile().then((p) => setRealCredits(p.photo_credits)).catch(() => {});
  }, [creditsProp]);

  const credits = realCredits ?? 0;

  if (fullScreen) {
    return <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>{children}</div>;
  }

  if (isDesktop) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
        <DesktopNav credits={credits} onCreditsClick={() => navigate("/pricing")} />
        <main style={{ flex: 1, width: "100%", maxWidth: 1440, margin: "0 auto", padding: "0 40px" }}>
          {children}
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      <Header
        title={title}
        showBack={showBack}
        showCredits={showCredits && !title}
        credits={credits}
        onCreditsClick={() => navigate("/pricing")}
        rightAction={headerRight}
      />
      <main style={{ flex: 1, overflowY: "auto", paddingBottom: showTabBar ? 64 : 0 }}>
        {children}
      </main>
      {showTabBar && <TabBar />}
    </div>
  );
}
