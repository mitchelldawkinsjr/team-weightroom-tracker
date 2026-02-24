import { PHASES } from "../../lib/constants.js";
import CheckInForm from "./CheckInForm.jsx";

export default function SessionStarter({
  activeSession,
  pct,
  pendingStart,
  onPendingStart,
  onCheckInSubmit,
  onOpenLog,
  onReset,
}) {
  return (
    <div>
      {activeSession && (
        <div
          onClick={onOpenLog}
          style={{
            background: "#1a1000",
            border: "1px solid #C8A43A",
            borderRadius: 10,
            padding: "14px 16px",
            marginBottom: 16,
            cursor: "pointer",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ color: "#C8A43A", fontWeight: "bold", fontSize: 13 }}>SESSION IN PROGRESS</div>
            <div style={{ color: "#888", fontSize: 12, marginTop: 2 }}>
              Phase {activeSession.phase} · {activeSession.type === "lift" ? "Lift" : "Speed"} · {pct}% complete
            </div>
          </div>
          <div style={{ color: "#C8A43A", fontSize: 18 }}>→</div>
        </div>
      )}

      {pendingStart ? (
        <CheckInForm onSubmit={(checkIn) => onCheckInSubmit(checkIn)} onCancel={() => onPendingStart(null)} />
      ) : (
        <>
          <div style={{ fontSize: 10, color: "#444", letterSpacing: 2, marginBottom: 10 }}>PICK PHASE + SESSION TYPE</div>
          {phases.map((ph) => (
            <div
              key={ph.id}
              style={{
                background: "#111",
                border: `1px solid ${ph.color}33`,
                borderRadius: 10,
                marginBottom: 10,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  background: `${ph.color}18`,
                  borderBottom: `1px solid ${ph.color}33`,
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div style={{ width: 3, height: 28, background: ph.color, borderRadius: 2 }} />
                <div>
                  <div style={{ color: "#fff", fontWeight: "bold", fontSize: 14 }}>
                    {ph.label} — {ph.name}
                  </div>
                  <div style={{ color: "#666", fontSize: 11 }}>{ph.weeks}</div>
                </div>
              </div>
              <div style={{ display: "flex" }}>
                {[
                  ["lift", "🏋️", "LIFT", "M / W / F"],
                  ["speed", "⚡", "SPEED", "T / TH"],
                ].map(([type, icon, label, days]) => (
                  <button
                    key={type}
                    onClick={() => onPendingStart({ phase: ph.id, type })}
                    style={{
                      flex: 1,
                      padding: "14px 8px",
                      background: "none",
                      border: "none",
                      borderRight: type === "lift" ? "1px solid #1e1e1e" : "none",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = `${ph.color}18`)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                  >
                    <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
                    <div style={{ fontSize: 11, fontWeight: "bold", color: ph.color, letterSpacing: 1 }}>{label}</div>
                    <div style={{ fontSize: 10, color: "#444", marginTop: 2 }}>{days}</div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
      <button
        onClick={onReset}
        style={{
          width: "100%",
          marginTop: 10,
          padding: "10px",
          background: "none",
          border: "1px solid #1e1e1e",
          borderRadius: 8,
          color: "#444",
          fontFamily: "inherit",
          fontSize: 12,
          cursor: "pointer",
        }}
      >
        Switch account / team code
      </button>
    </div>
  );
}
