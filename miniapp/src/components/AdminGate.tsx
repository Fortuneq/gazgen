import { useEffect, useState, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../api";

export function AdminGate({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    api.adminCheck()
      .then(() => setAllowed(true))
      .catch((err) => {
        if (err instanceof ApiError && (err.status === 403 || err.status === 401)) {
          navigate("/", { replace: true });
        } else {
          navigate("/", { replace: true });
        }
      });
  }, [navigate]);

  if (allowed === null) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100vh", background: "var(--bg)",
      }}>
        <div style={{
          width: 32, height: 32, border: "3px solid #27272A",
          borderTopColor: "#C4F82A", borderRadius: "50%",
          animation: "spin 1s linear infinite",
        }} />
      </div>
    );
  }

  return <>{children}</>;
}
