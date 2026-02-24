import { useState } from "react";
import { phaseColor, calcLoad, fmtDate } from "../../lib/helpers.js";
import { Pill, Up, Down } from "../ui/index.js";

export default function SessionRow({ session: s, onClickAthlete }) {
  const [open, setOpen] = useState(false);
  const pc = phaseColor(s.phase);
  const ld = calcLoad(s.rpe, s.duration);
  const doneSets = s.exercises.reduce((a, e) => a + e.sets_data.filter(sd => sd.done).length, 0);
  const totalSets = s.exercises.reduce((a, e) => a + e.sets_data.length, 0);

  return (
    <div style={{ background: "#111", border: `1px solid ${pc}22`, borderRadius: 10, marginBottom: 8, overflow: "hidden" }}>
      <div style={{ padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flex: 1 }}>
          <div style={{ width: 3, height: 30, background: pc, borderRadius: 2 }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button onClick={onClickAthlete} style={{
                background: "none", border: "none", color: "#e0e0e0", fontWeight: "bold",
                fontSize: 13, cursor: "pointer", fontFamily: "inherit", padding: 0,
                textDecoration: "underline", textDecorationColor: "#333",
              }}>{s.athleteName}</button>
              <div style={{ fontSize: 11, color: "#555" }}>{s.position}</div>
            </div>
            <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>
              Phase {s.phase} · {s.type === "lift" ? "Lift" : "Speed"} · {fmtDate(s.date)}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ textAlign: "right" }}>
            {ld > 0 && <div style={{ fontSize: 13, fontWeight: "bold", color: pc }}>{ld}</div>}
            <div style={{ fontSize: 10, color: "#333" }}>{doneSets}/{totalSets}</div>
          </div>
          <button onClick={() => setOpen(!open)} style={{
            background: "none", border: "none", color: "#444", cursor: "pointer", padding: 4,
          }}>{open ? <Up /> : <Down />}</button>
        </div>
      </div>

      {open && (
        <div style={{ borderTop: "1px solid #161616", padding: "12px 14px" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            {s.rpe && <Pill label="RPE" value={`${s.rpe}/10`} color={pc} />}
            {s.duration && <Pill label="Time" value={`${s.duration}m`} color={pc} />}
            {ld > 0 && <Pill label="Load" value={ld} color={pc} />}
            <Pill label="Sets done" value={`${doneSets}/${totalSets}`} color={doneSets === totalSets ? "#2E7D52" : "#555"} />
          </div>

          {s.checkIn && (
            <div style={{ background: "#161616", borderRadius: 6, padding: "9px 12px", marginBottom: 10 }}>
              <div style={{ fontSize: 9, color: "#444", marginBottom: 4 }}>CHECK-IN</div>
              <div style={{ fontSize: 12, color: "#aaa" }}>
                Sleep {s.checkIn.sleep} · Sore {s.checkIn.soreness} · Mood {s.checkIn.mood} · Mot {s.checkIn.motivation}
              </div>
              {s.checkIn.painYesNo && (
                <div style={{ fontSize: 11, color: "#e06050", marginTop: 4 }}>
                  Reported pain{s.checkIn.painArea ? `: ${s.checkIn.painArea}` : ": Yes"}
                </div>
              )}
              {s.checkInRecommendations?.length > 0 && (
                <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 11, color: "#888" }}>
                  {s.checkInRecommendations.map((rec, i) => <li key={i}>{rec}</li>)}
                </ul>
              )}
            </div>
          )}

          {s.exercises.map((ex, ei) => {
            const filled = ex.sets_data.filter(sd => sd.weight || sd.reps);
            if (!filled.length) return null;
            return (
              <div key={ei} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: "#777", fontWeight: "bold", marginBottom: 5 }}>{ex.name}</div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {ex.sets_data.map((sd, si) => {
                    if (!sd.weight && !sd.reps) return null;
                    return (
                      <div key={si} style={{
                        background: sd.done ? "#091509" : "#1a1a1a",
                        border: `1px solid ${sd.done ? "#2E7D5244" : "#1e1e1e"}`,
                        borderRadius: 6, padding: "5px 10px", textAlign: "center", minWidth: 54,
                      }}>
                        <div style={{ fontSize: 9, color: "#333" }}>S{si + 1}</div>
                        <div style={{ fontSize: 13, fontWeight: "bold", color: sd.done ? "#6BCF7F" : "#ccc" }}>{sd.weight || "—"}</div>
                        {sd.reps && <div style={{ fontSize: 10, color: "#555" }}>×{sd.reps}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {s.notes && (
            <div style={{ background: "#161616", borderRadius: 6, padding: "9px 12px", marginTop: 6 }}>
              <div style={{ fontSize: 9, color: "#444", marginBottom: 2 }}>ATHLETE NOTES</div>
              <div style={{ fontSize: 12, color: "#aaa", fontStyle: "italic" }}>{s.notes}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
