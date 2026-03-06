import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Layout } from "../components/Layout";
import { useIsDesktop } from "../hooks/useMediaQuery";
import { api } from "../api";
import { haptic } from "../telegram";
import { Lightbulb } from "lucide-react";

export default function LoadingPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isDesktop = useIsDesktop();
  const genState = location.state as { prompt?: string; model?: string; aspectRatio?: string } | null;
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Animate progress bar (fake progress up to 90%)
    intervalRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) return p;
        return p + Math.random() * 5 + 1;
      });
    }, 500);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (!taskId) return;

    // Poll generation status every 3 seconds
    pollRef.current = setInterval(async () => {
      try {
        const status = await api.getGenerationStatus(taskId);
        if (status.status === "success") {
          haptic("medium");
          setProgress(100);
          if (pollRef.current) clearInterval(pollRef.current);
          if (intervalRef.current) clearInterval(intervalRef.current);
          setTimeout(() => navigate(`/result/${taskId}`, {
            replace: true,
            state: genState,
          }), 400);
        } else if (status.status === "failed") {
          if (pollRef.current) clearInterval(pollRef.current);
          if (intervalRef.current) clearInterval(intervalRef.current);
          haptic("heavy");
          navigate(-1);
        }
      } catch {
        // Silently retry on next interval
      }
    }, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [taskId, navigate]);

  const spinner = (
    <div style={{
      width: isDesktop ? 72 : 80, height: isDesktop ? 72 : 80,
      borderRadius: "50%", border: "3px solid #27272A",
      borderTopColor: "#C4F82A",
      animation: "spin 1s linear infinite",
    }} />
  );

  const progressBar = (
    <div style={{
      width: isDesktop ? 320 : 200, height: 4, borderRadius: 2,
      background: "#18181B", overflow: "hidden",
    }}>
      <div style={{
        width: `${Math.min(progress, 100)}%`, height: "100%", borderRadius: 2,
        background: "linear-gradient(90deg, #C4F82A 0%, #A3D921 100%)",
        transition: "width 0.5s ease-out",
      }} />
    </div>
  );

  const taskIdDisplay = taskId ? (
    <div style={{
      display: "flex", alignItems: "center", gap: isDesktop ? 8 : 0,
      padding: isDesktop ? "8px 16px" : "6px 12px",
      borderRadius: 8, background: "#18181B", border: "1px solid #27272A",
    }}>
      {isDesktop ? (
        <>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#52525B" }}>Task ID:</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#C4F82A" }}>{taskId}</span>
        </>
      ) : (
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#52525B" }}>
          Task ID: {taskId}
        </span>
      )}
    </div>
  ) : null;

  /* ─── Mobile Layout ─── */
  if (!isDesktop) {
    return (
      <Layout fullScreen>
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 24,
        }}>
          {spinner}

          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
          }}>
            <span style={{
              fontFamily: "var(--font-primary)", fontSize: 20, fontWeight: 700,
              color: "#FFFFFF", textAlign: "center",
            }}>
              Генерируем изображение...
            </span>
            <span style={{
              fontFamily: "var(--font-body)", fontSize: 14, color: "#A1A1AA",
              textAlign: "center",
            }}>
              15-30 секунд
            </span>
          </div>

          {taskIdDisplay}
          {progressBar}
        </div>
      </Layout>
    );
  }

  /* ─── Desktop Layout ─── */
  return (
    <Layout>
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 24,
        minHeight: "calc(100vh - 64px - 56px)",
      }}>
        {spinner}

        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
        }}>
          <span style={{
            fontFamily: "var(--font-primary)", fontSize: 24, fontWeight: 700,
            color: "#FFFFFF",
          }}>
            Генерируем изображение...
          </span>
          <span style={{
            fontFamily: "var(--font-body)", fontSize: 16, color: "#A1A1AA",
          }}>
            15-30 секунд
          </span>
        </div>

        {progressBar}
        {taskIdDisplay}

        {/* Tip section */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "12px 20px", borderRadius: 10,
          background: "rgba(24, 24, 27, 0.08)",
        }}>
          <Lightbulb size={16} color="#A1A1AA" />
          <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#52525B" }}>
            Совет: добавьте больше деталей в промпт для лучшего результата
          </span>
        </div>
      </div>
    </Layout>
  );
}
