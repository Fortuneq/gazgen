import type { Gender } from "../types";
import { haptic } from "../telegram";

interface GenderFilterProps {
  value: Gender;
  onChange: (g: Gender) => void;
}

const genders: { key: Gender; label: string }[] = [
  { key: "male", label: "Мужское" },
  { key: "female", label: "Женское" },
  { key: "unisex", label: "Унисекс" },
];

export function GenderFilter({ value, onChange }: GenderFilterProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 20px" }}>
      {genders.map((g) => {
        const active = value === g.key;
        return (
          <button key={g.key}
            onClick={() => { haptic(); onChange(g.key); }}
            style={{
              padding: "6px 16px", borderRadius: 100,
              background: active ? "#C4F82A" : "transparent",
              border: active ? "none" : "1px solid #27272A",
              color: active ? "#0A0A0A" : "#A1A1AA",
              fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 500,
              transition: "all 0.2s",
            }}>
            {g.label}
          </button>
        );
      })}
    </div>
  );
}
