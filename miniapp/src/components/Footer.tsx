export function Footer() {
  return (
    <footer style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      height: 56, padding: "0 40px", width: "100%", flexShrink: 0,
      borderTop: "1px solid #27272A",
    }}>
      <span style={{ fontFamily: "var(--font-primary)", fontSize: 14, fontWeight: 600, color: "#71717A" }}>
        Photix
      </span>
      <div style={{ display: "flex", gap: 24 }}>
        <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#71717A" }}>Telegram</span>
        <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#71717A" }}>Поддержка</span>
        <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#71717A" }}>Загрузить бот</span>
      </div>
      <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#52525B" }}>
        © 2025 Photix
      </span>
    </footer>
  );
}
