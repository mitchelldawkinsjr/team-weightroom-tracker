import { phaseColor, fmtDate, calcLoad } from "../../lib/helpers.js";
import { Pill, Up, Down } from "../ui/index.js";

export default function SessionHistory({ sessions, histOpen, setHistOpen }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "#444", letterSpacing: 2, marginBottom: 14 }}>
        {sessions.length} SESSION{sessions.length !== 1 ? "S" : ""} LOGGED
      </div>
      {sessions.length === 0 && (
        <div style={{ textAlign: "center", paddingTop: 50 }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
          <div style={{ color: "#444", fontSize: 14 }}>No sessions yet.</div>
        </div>
      )}
      {sessions.map((s, i) => {
        const pc = phaseColor(s.phase);
        const ld = calcLoad(s.rpe, s.duration);
        const open = histOpen === i;
        const d = s.exercises.reduce((a, e) => a + e.sets_data.filter((sd) => sd.done).length, 0);
        const t = s.exercises.reduce((a, e) => a + e.sets_data.length, 0);
        return (
          <div
            key={i}
            style={{
              background: "#111",
              border: `1px solid ${pc}33`,
              borderRadius: 10,
              marginBottom: 10,
              overflow: "hidden",
            }}
          >
            <div
              onClick={() => setHistOpen(open ? null : i)}
              style={{
                padding: "13px 14px",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ width: 3, height: 32, background: pc, borderRadius: 2 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: "bold", color: "#e0e0e0" }}>
                    Phase {s.phase} · {s.type === "lift" ? "Lift" : "Speed"}
                  </div>
                  <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{fmtDate(s.date)}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {ld > 0 && (
                  <div style={{ fontSize: 13, color: pc, fontWeight: "bold" }}>
                    {ld}
                  </div>
                )}
                <div style={{ fontSize: 11, color: "#333" }}>{d}/{t}</div>
                <div style={{ color: "#333" }}>{open ? <Up /> : <Down />}</div>
              </div>
            </div>
            {open && (
              <div style={{ borderTop: "1px solid #161616", padding: "12px 14px" }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                  {s.rpe && <Pill label="RPE" value={`${s.rpe}/10`} color={pc} />}
                  {s.duration && <Pill label="Duration" value={`${s.duration}m`} color={pc} />}
                  {ld > 0 && <Pill label="Load" value={ld} color={pc} />}
                </div>
                {s.exercises.map((ex, ei) => {
                  const hasData = ex.sets_data.some((sd) => sd.weight || sd.reps);
                  if (!hasData) return null;
                  return (
                    <div key={ei} style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 11, color: "#777", fontWeight: "bold", marginBottom: 5 }}>{ex.name}</div>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {ex.sets_data.map((sd, si) => {
                          if (!sd.weight && !sd.reps) return null;
                          return (
                            <div
                              key={si}
                              style={{
                                background: sd.done ? "#091509" : "#1a1a1a",
                                border: `1px solid ${sd.done ? "#2E7D5233" : "#222"}`,
                                borderRadius: 6,
                                padding: "5px 10px",
                                textAlign: "center",
                                minWidth: 60,
                              }}
                            >
                              <div style={{ fontSize: 9, color: "#444" }}>S{si + 1}</div>
                              <div style={{ fontSize: 13, fontWeight: "bold", color: sd.done ? "#6BCF7F" : "#ccc" }}>
                                {sd.weight || "—"}
                              </div>
                              {sd.reps && <div style={{ fontSize: 10, color: "#555" }}>{sd.reps}</div>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {s.notes && (
                  <div style={{ background: "#161616", borderRadius: 6, padding: "9px 12px", marginTop: 8 }}>
                    <div style={{ fontSize: 10, color: "#444", marginBottom: 3 }}>NOTES</div>
                    <div style={{ fontSize: 12, color: "#aaa" }}>{s.notes}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
