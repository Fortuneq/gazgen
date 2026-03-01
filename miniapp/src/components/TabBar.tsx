import { Compass, PlusCircle, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { haptic } from "../telegram";

const tabs = [
  { path: "/", icon: Compass, label: "Explore" },
  { path: "/create", icon: PlusCircle, label: "Create" },
  { path: "/profile", icon: User, label: "Profile" },
] as const;

export function TabBar() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <nav style={{
      display: "flex", alignItems: "center", justifyContent: "space-around",
      height: 64, width: "100%", flexShrink: 0,
      background: "rgba(10, 10, 10, 0.91)",
      borderTop: "1px solid #27272A",
      backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
    }}>
      {tabs.map((tab) => {
        const active = isActive(tab.path);
        const Icon = tab.icon;
        return (
          <button key={tab.path} onClick={() => { haptic(); navigate(tab.path); }}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              padding: "8px 0", background: "none", border: "none", minWidth: 64,
            }}>
            <Icon size={24} color={active ? "#C4F82A" : "#71717A"} strokeWidth={active ? 2.5 : 2} />
            <span style={{
              fontFamily: "var(--font-body)", fontSize: 10, fontWeight: active ? 600 : 500,
              color: active ? "#C4F82A" : "#71717A",
            }}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
