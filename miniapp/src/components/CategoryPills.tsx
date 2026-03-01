import { haptic } from "../telegram";

interface CategoryPillsProps {
  categories: string[];
  active: string;
  onChange: (cat: string) => void;
}

export function CategoryPills({ categories, active, onChange }: CategoryPillsProps) {
  return (
    <div style={{
      display: "flex", gap: 8, overflowX: "auto", padding: "4px 20px",
      scrollbarWidth: "none", msOverflowStyle: "none",
    }}>
      {categories.map((cat) => {
        const isActive = active === cat;
        return (
          <button key={cat}
            onClick={() => { haptic(); onChange(cat); }}
            style={{
              padding: "8px 16px", borderRadius: 100, whiteSpace: "nowrap", flexShrink: 0,
              background: isActive ? "#C4F82A" : "transparent",
              border: isActive ? "none" : "1px solid #27272A",
              color: isActive ? "#0A0A0A" : "#A1A1AA",
              fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 500,
              transition: "all 0.2s",
            }}>
            {cat}
          </button>
        );
      })}
    </div>
  );
}
