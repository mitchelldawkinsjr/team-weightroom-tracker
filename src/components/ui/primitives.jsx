export const Card = ({ children, style = {} }) => (
  <div style={{ background: "#111", border: "1px solid #222", borderRadius: 10, ...style }}>{children}</div>
);

export const Label = ({ children }) => (
  <div style={{ fontSize: 10, letterSpacing: 2, color: "#555", marginBottom: 5, textTransform: "uppercase" }}>{children}</div>
);

export const Input = ({ style = {}, ...props }) => (
  <input style={{
    width: "100%", padding: "10px 12px", background: "#1a1a1a",
    border: "1px solid #2a2a2a", borderRadius: 7, color: "#fff",
    fontFamily: "inherit", fontSize: 15, boxSizing: "border-box", ...style,
  }} {...props} />
);

export const Btn = ({ children, onClick, color = "#C8A43A", text = "#0D1F3C", style = {}, disabled }) => (
  <button onClick={onClick} disabled={disabled} style={{
    padding: "12px 20px", background: disabled ? "#222" : color, color: disabled ? "#444" : text,
    border: "none", borderRadius: 8, fontFamily: "inherit", fontWeight: "bold",
    fontSize: 14, cursor: disabled ? "default" : "pointer", letterSpacing: 1, ...style,
  }}>{children}</button>
);

export const Shell = ({ children }) => (
  <div style={{ background: "#0a0a0a", minHeight: "100vh", fontFamily: "Georgia, serif", color: "#f0f0f0", maxWidth: 460, margin: "0 auto", padding: "20px 16px 60px" }}>
    {children}
  </div>
);

export const Pill = ({ label, value, color }) => (
  <div style={{ background: `${color}18`, border: `1px solid ${color}33`, borderRadius: 6, padding: "5px 10px" }}>
    <div style={{ fontSize: 9, color: "#555", letterSpacing: 1 }}>{label.toUpperCase()}</div>
    <div style={{ fontSize: 14, fontWeight: "bold", color }}>{value}</div>
  </div>
);
