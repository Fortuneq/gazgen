import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { App } from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { TelegramGate } from "./components/TelegramGate";
import { initTelegram } from "./telegram";
import "./styles/globals.css";
import "./styles/animations.css";

try {
  initTelegram();

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <ErrorBoundary>
        <HashRouter>
          <TelegramGate>
            <App />
          </TelegramGate>
        </HashRouter>
      </ErrorBoundary>
    </React.StrictMode>
  );
} catch (e: any) {
  // Show error on screen for debugging
  const root = document.getElementById("root");
  if (root) {
    root.innerHTML = `<pre style="color:#EF4444;padding:20px;font-size:12px;word-wrap:break-word;white-space:pre-wrap;">INIT ERROR:\n${e?.stack || e}</pre>`;
  }
}
