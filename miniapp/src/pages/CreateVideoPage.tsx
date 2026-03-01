import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Video, ArrowLeft } from "lucide-react";
import { Layout } from "../components/Layout";
import { useIsDesktop } from "../hooks/useMediaQuery";
import { haptic } from "../telegram";

const COST_MAP: Record<string, number> = {
  "kling2.6": 5,
  "kling3.0": 7,
  veo: 8,
  sora: 10,
};

const FORMAT_OPTIONS: Array<{ value: "16:9" | "9:16" | "1:1"; label: string }> = [
  { value: "16:9", label: "16:9" },
  { value: "9:16", label: "9:16" },
  { value: "1:1", label: "1:1" },
];

const DURATION_OPTIONS: Array<{ value: "5" | "10" | "15"; label: string }> = [
  { value: "5", label: "5 сек" },
  { value: "10", label: "10 сек" },
  { value: "15", label: "15 сек" },
];

const MODEL_OPTIONS: Array<{
  value: "kling2.6" | "kling3.0" | "veo" | "sora";
  label: string;
}> = [
  { value: "kling2.6", label: "Kling 2.6" },
  { value: "kling3.0", label: "Kling 3.0" },
  { value: "veo", label: "Veo" },
  { value: "sora", label: "Sora" },
];

function PillGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            onClick={() => {
              haptic("light");
              onChange(opt.value);
            }}
            style={{
              padding: "8px 16px",
              borderRadius: 20,
              border: active ? "none" : "1px solid var(--border)",
              background: active ? "var(--accent)" : "var(--surface)",
              color: active ? "#0A0A0A" : "var(--text)",
              fontFamily: "var(--font-body)",
              fontSize: 14,
              fontWeight: active ? 600 : 400,
              cursor: "pointer",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-primary)",
        fontSize: 14,
        fontWeight: 600,
        color: "var(--text-secondary)",
        marginBottom: 8,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
      }}
    >
      {children}
    </div>
  );
}

function ToggleSwitch({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => {
        haptic("light");
        onChange(!value);
      }}
      style={{
        width: 44,
        height: 26,
        borderRadius: 13,
        background: value ? "#22C55E" : "var(--border)",
        border: "none",
        cursor: "pointer",
        position: "relative",
        transition: "background 0.2s",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 3,
          left: value ? 21 : 3,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "#FFFFFF",
          transition: "left 0.2s",
        }}
      />
    </button>
  );
}

function FormFields({
  prompt,
  setPrompt,
  format,
  setFormat,
  duration,
  setDuration,
  model,
  setModel,
  motionControl,
  setMotionControl,
}: {
  prompt: string;
  setPrompt: (v: string) => void;
  format: "16:9" | "9:16" | "1:1";
  setFormat: (v: "16:9" | "9:16" | "1:1") => void;
  duration: "5" | "10" | "15";
  setDuration: (v: "5" | "10" | "15") => void;
  model: "kling2.6" | "kling3.0" | "veo" | "sora";
  setModel: (v: "kling2.6" | "kling3.0" | "veo" | "sora") => void;
  motionControl: boolean;
  setMotionControl: (v: boolean) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <SectionLabel>Промпт</SectionLabel>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Опишите видео, которое хотите создать..."
          rows={4}
          style={{
            width: "100%",
            borderRadius: 16,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--text)",
            fontFamily: "var(--font-body)",
            fontSize: 14,
            padding: "12px 14px",
            resize: "none",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      <div>
        <SectionLabel>Формат</SectionLabel>
        <PillGroup options={FORMAT_OPTIONS} value={format} onChange={setFormat} />
      </div>

      <div>
        <SectionLabel>Длительность</SectionLabel>
        <PillGroup
          options={DURATION_OPTIONS}
          value={duration}
          onChange={setDuration}
        />
      </div>

      <div>
        <SectionLabel>Модель</SectionLabel>
        <PillGroup options={MODEL_OPTIONS} value={model} onChange={setModel} />
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: "14px 16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Video size={18} color="var(--text-secondary)" />
          <span
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 15,
              color: "var(--text)",
            }}
          >
            Контроль движения
          </span>
        </div>
        <ToggleSwitch value={motionControl} onChange={setMotionControl} />
      </div>
    </div>
  );
}

export default function CreateVideoPage() {
  const isDesktop = useIsDesktop();

  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [format, setFormat] = useState<"16:9" | "9:16" | "1:1">("16:9");
  const [duration, setDuration] = useState<"5" | "10" | "15">("5");
  const [model, setModel] = useState<"kling2.6" | "kling3.0" | "veo" | "sora">(
    "kling2.6"
  );
  const [motionControl, setMotionControl] = useState(true);

  const cost = COST_MAP[model];

  const handleCreate = () => {
    haptic("medium");
    // TODO: submit generation
  };

  if (isDesktop) {
    return (
      <Layout>
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "48px 24px",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 14,
              color: "var(--text-secondary)",
              marginBottom: 32,
            }}
          >
            Создать &gt; Видео
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
              <h1
                style={{
                  fontFamily: "var(--font-primary)",
                  fontSize: 28,
                  fontWeight: 700,
                  color: "var(--text)",
                  margin: 0,
                }}
              >
                Создать видео
              </h1>

              <FormFields
                prompt={prompt}
                setPrompt={setPrompt}
                format={format}
                setFormat={setFormat}
                duration={duration}
                setDuration={setDuration}
                model={model}
                setModel={setModel}
                motionControl={motionControl}
                setMotionControl={setMotionControl}
              />

              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: 14,
                      color: "var(--text-secondary)",
                    }}
                  >
                    Стоимость
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-primary)",
                      fontSize: 15,
                      fontWeight: 600,
                      color: "var(--text)",
                    }}
                  >
                    ⚡ {cost} кредитов
                  </span>
                </div>
                <button
                  onClick={handleCreate}
                  style={{
                    width: "100%",
                    height: 52,
                    borderRadius: 16,
                    background: "var(--accent)",
                    border: "none",
                    color: "#0A0A0A",
                    fontFamily: "var(--font-primary)",
                    fontSize: 16,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Создать видео — {cost} кредитов
                </button>
              </div>
            </div>

            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 20,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                minHeight: 400,
              }}
            >
              <Video size={48} color="var(--text-muted)" />
              <span
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 14,
                  color: "var(--text-muted)",
                }}
              >
                Предпросмотр появится здесь
              </span>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Создать видео" showBack showTabBar={false} fullScreen>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: 56, padding: "0 20px", flexShrink: 0,
      }}>
        <button onClick={() => navigate(-1)} style={{ display: "flex", padding: 0, background: "none", border: "none", cursor: "pointer" }}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </button>
        <span style={{ fontFamily: "var(--font-primary)", fontSize: 18, fontWeight: 700, color: "#FFFFFF" }}>
          Создать видео
        </span>
        <div style={{ width: 24 }} />
      </div>
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 20px",
          paddingBottom: 120,
        }}
      >
        <FormFields
          prompt={prompt}
          setPrompt={setPrompt}
          format={format}
          setFormat={setFormat}
          duration={duration}
          setDuration={setDuration}
          model={model}
          setModel={setModel}
          motionControl={motionControl}
          setMotionControl={setMotionControl}
        />
      </div>

      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "var(--bg)",
          borderTop: "1px solid var(--border)",
          padding: "12px 20px 24px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 14,
              color: "var(--text-secondary)",
            }}
          >
            Стоимость
          </span>
          <span
            style={{
              fontFamily: "var(--font-primary)",
              fontSize: 15,
              fontWeight: 600,
              color: "var(--text)",
            }}
          >
            ⚡ {cost} кредитов
          </span>
        </div>
        <button
          onClick={handleCreate}
          style={{
            width: "100%",
            height: 52,
            borderRadius: 16,
            background: "var(--accent)",
            border: "none",
            color: "#0A0A0A",
            fontFamily: "var(--font-primary)",
            fontSize: 16,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Создать видео — {cost} кредитов
        </button>
      </div>
    </Layout>
  );
}
