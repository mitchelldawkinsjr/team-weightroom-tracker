import { Shell } from "./ui/index.js";

export default function Landing({ onSelect }) {
  return (
    <Shell>
      <div style={{ textAlign: "center", padding: "40px 0 20px" }}>
        <div style={{ fontSize: 13, color: "#C8A43A", letterSpacing: 3, marginBottom: 8 }}>GODWIN HEIGHTS FOOTBALL</div>
        <div style={{ fontSize: 26, fontWeight: "bold", color: "#fff", marginBottom: 4 }}>Weightroom Tracker</div>
        <div style={{ fontSize: 13, color: "#555" }}>Who are you?</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 30 }}>
        <button onClick={() => onSelect("setup")} style={{
          padding: "22px 20px", background: "#0D1F3C", border: "2px solid #C8A43A",
          borderRadius: 12, color: "#fff", fontFamily: "Georgia, serif",
          cursor: "pointer", textAlign: "left",
        }}>
          <div style={{ fontSize: 24, marginBottom: 6 }}>🏋️</div>
          <div style={{ fontSize: 16, fontWeight: "bold", color: "#C8A43A" }}>I'm an Athlete</div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 3 }}>Log my workouts and track my progress</div>
        </button>

        <button onClick={() => onSelect("setup")} style={{
          padding: "22px 20px", background: "#1a0000", border: "2px solid #922B21",
          borderRadius: 12, color: "#fff", fontFamily: "Georgia, serif",
          cursor: "pointer", textAlign: "left",
        }}>
          <div style={{ fontSize: 24, marginBottom: 6 }}>📋</div>
          <div style={{ fontSize: 16, fontWeight: "bold", color: "#e06050" }}>I'm a Coach</div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 3 }}>View team attendance, numbers, and session details</div>
        </button>

        <button onClick={() => onSelect("redeem_code")} style={{
          padding: "18px 20px", background: "#111", border: "1px solid #333",
          borderRadius: 12, color: "#aaa", fontFamily: "Georgia, serif",
          cursor: "pointer", textAlign: "left",
        }}>
          <div style={{ fontSize: 20, marginBottom: 4 }}>📱</div>
          <div style={{ fontSize: 14, fontWeight: "bold", color: "#C8A43A" }}>I have a login code from my coach</div>
          <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>Log in on this device with a one-time code</div>
        </button>
      </div>

      <div style={{ marginTop: 24, padding: "14px 16px", background: "#111", borderRadius: 8, border: "1px solid #1e1e1e" }}>
        <div style={{ fontSize: 11, color: "#555", lineHeight: 1.7 }}>
          Both athletes and coaches use the same <strong style={{ color: "#C8A43A" }}>Team Code</strong> to sync data. Athletes enter their name + team code. Coaches enter the same team code to see everyone's sessions.
        </div>
      </div>
    </Shell>
  );
}
