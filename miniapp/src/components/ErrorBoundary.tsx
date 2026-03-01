import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        padding: 32,
        background: "#0A0A0A",
        color: "#FFFFFF",
        fontFamily: "'Manrope', sans-serif",
        textAlign: "center",
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 16,
          background: "rgba(239, 68, 68, 0.15)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 28,
        }}>
          !
        </div>
        <h1 style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 22,
          fontWeight: 700,
          margin: 0,
        }}>
          Что-то пошло не так
        </h1>
        <p style={{ fontSize: 15, color: "#A1A1AA", maxWidth: 320, margin: 0 }}>
          Произошла непредвиденная ошибка. Попробуйте перезагрузить приложение.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: 8,
            padding: "14px 32px",
            borderRadius: 100,
            background: "#C4F82A",
            border: "none",
            cursor: "pointer",
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 15,
            fontWeight: 700,
            color: "#0A0A0A",
          }}
        >
          Попробовать снова
        </button>
      </div>
    );
  }
}
