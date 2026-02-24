import { useState } from "react";
import { phaseColor, calcLoad, fmtDate, makeLoginCodeKey, generateLoginCode, LOGIN_CODE_TTL_MS } from "../../lib/helpers.js";
import { isApiAvailable, createLoginCode } from "../../storage-api-client.js";
import { Card, Label, Pill, Back, Down, Up } from "../ui/index.js";

export default function AthleteDetail({ athlete, athleteId, sessions, teamCode, onBack }) {
  const [expandIdx, setExpandIdx] = useState(null);
  const [generatedCode, setGeneratedCode] = useState(null);
  const [codeGenerating, setCodeGenerating] = useState(false);

  const handleGenerateLoginCode = async () => {
    if (!athlete || !teamCode) return;
    setCodeGenerating(true);
    try {
      if (isApiAvailable()) {
        const res = await createLoginCode(athleteId, teamCode);
        setGeneratedCode({ code: res.code, expiresAt: new Date(res.expiresAt).getTime() });
      } else {
        const code = generateLoginCode();
        const identity = {
          name: athlete.name,
          teamCode,
          athleteId,
          position: athlete.position || "",
          grade: athlete.grade || "",
          jerseyNumber: athlete.jerseyNumber || undefined,
          level: athlete.level || undefined,
          isCoach: false,
        };
        const expiresAt = Date.now() + LOGIN_CODE_TTL_MS;
        await window.storage.set(makeLoginCodeKey(code), JSON.stringify({ identity, expiresAt }), true);
        setGeneratedCode({ code, expiresAt });
      }
    } catch (_) {}
    setCodeGenerating(false);
  };
  const loads = sessions.filter(s => s.rpe && s.duration).map(s => calcLoad(s.rpe, s.duration));
  const avgLoad = loads.length ? Math.round(loads.reduce((a, b) => a + b, 0) / loads.length) : 0;
  const liftSessions = sessions.filter(s => s.type === "lift").length;
  const speedSessions = sessions.filter(s => s.type === "speed").length;

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", fontFamily: "Georgia, serif", color: "#f0f0f0", maxWidth: 520, margin: "0 auto", paddingBottom: 60 }}>
      <div style={{ background: "#1a0000", borderBottom: "2px solid #922B21", padding: "12px 16px", position: "sticky", top: 0, zIndex: 50, display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "#e06050", cursor: "pointer", padding: 4 }}><Back /></button>
        <div>
          <div style={{ color: "#e06050", fontWeight: "bold", fontSize: 15 }}>{athlete?.name}</div>
          <div style={{ color: "#555", fontSize: 11 }}>{[athlete?.position, athlete?.grade, athlete?.level === "varsity" ? "Varsity" : athlete?.level === "junior_varsity" ? "JV" : null].filter(Boolean).join(" · ")}</div>
        </div>
      </div>

      <div style={{ padding: "14px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, marginBottom: 16 }}>
          {[
            ["Sessions", sessions.length, "#C8A43A"],
            ["Lifts", liftSessions, "#1A5276"],
            ["Speed", speedSessions, "#2E7D52"],
            ["Avg Load", avgLoad || "—", "#6C3483"],
          ].map(([l, v, c]) => (
            <Card key={l} style={{ padding: "10px 8px", textAlign: "center" }}>
              <div style={{ fontSize: 9, color: "#444", marginBottom: 3, letterSpacing: 1 }}>{l.toUpperCase()}</div>
              <div style={{ fontSize: 22, fontWeight: "bold", color: c }}>{v}</div>
            </Card>
          ))}
        </div>

        <Card style={{ padding: "12px 14px", marginBottom: 16, border: "1px solid #C8A43A33" }}>
          <Label>LOG IN ON ANOTHER DEVICE</Label>
          <div style={{ fontSize: 12, color: "#888", marginBottom: 10 }}>
            Generate a one-time code so {athlete?.name} can log in on a phone, tablet, or other device. Their main device stays logged in.
          </div>
          <button onClick={handleGenerateLoginCode} disabled={codeGenerating} style={{
            padding: "10px 16px", background: codeGenerating ? "#222" : "#C8A43A", color: codeGenerating ? "#444" : "#0D1F3C",
            border: "none", borderRadius: 8, fontFamily: "inherit", fontWeight: "bold", fontSize: 13, cursor: codeGenerating ? "default" : "pointer",
          }}>
            {codeGenerating ? "..." : "Generate login code"}
          </button>
          {generatedCode && (
            <div style={{ marginTop: 14, padding: "12px 14px", background: "#0a0a0a", borderRadius: 8, border: "1px solid #C8A43A" }}>
              <div style={{ fontSize: 10, color: "#555", marginBottom: 6 }}>Give this code to the athlete (valid 15 min)</div>
              <div style={{ fontSize: 28, fontWeight: "bold", letterSpacing: 6, color: "#C8A43A", fontFamily: "monospace" }}>{generatedCode.code}</div>
              <button onClick={() => { navigator.clipboard?.writeText(generatedCode.code); }} style={{
                marginTop: 8, padding: "6px 12px", background: "#1a1a1a", border: "1px solid #333", borderRadius: 6,
                color: "#aaa", fontSize: 11, fontFamily: "inherit", cursor: "pointer",
              }}>Copy code</button>
            </div>
          )}
        </Card>

        <Label>ALL SESSIONS</Label>
        {sessions.length === 0 && <div style={{ color: "#444", padding: "30px 0", textAlign: "center" }}>No sessions logged yet.</div>}
        {sessions.map((s, i) => {
          const pc = phaseColor(s.phase);
          const ld = calcLoad(s.rpe, s.duration);
          const dn = s.exercises.reduce((a, e) => a + e.sets_data.filter(sd => sd.done).length, 0);
          const tt = s.exercises.reduce((a, e) => a + e.sets_data.length, 0);
          const open = expandIdx === i;
          return (
            <div key={i} style={{ background: "#111", border: `1px solid ${pc}22`, borderRadius: 10, marginBottom: 8, overflow: "hidden" }}>
              <div onClick={() => setExpandIdx(open ? null : i)} style={{ padding: "12px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div style={{ width: 3, height: 28, background: pc, borderRadius: 2 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: "bold", color: "#e0e0e0" }}>Phase {s.phase} · {s.type === "lift" ? "🏋️ Lift" : "⚡ Speed"}</div>
                    <div style={{ fontSize: 11, color: "#555", marginTop: 1 }}>{fmtDate(s.date)}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ textAlign: "right" }}>
                    {ld > 0 && <div style={{ fontSize: 12, fontWeight: "bold", color: pc }}>{ld} pts</div>}
                    <div style={{ fontSize: 10, color: "#333" }}>{dn}/{tt} sets</div>
                  </div>
                  <div style={{ color: "#333" }}>{open ? <Up /> : <Down />}</div>
                </div>
              </div>
              {open && (
                <div style={{ borderTop: "1px solid #161616", padding: "12px 14px" }}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                    {s.rpe && <Pill label="RPE" value={`${s.rpe}/10`} color={pc} />}
                    {s.duration && <Pill label="Duration" value={`${s.duration}m`} color={pc} />}
                    {ld > 0 && <Pill label="Load Score" value={ld} color={pc} />}
                    <Pill label="Completion" value={`${Math.round((dn / tt) * 100)}%`} color={dn === tt ? "#2E7D52" : "#555"} />
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
                          {s.checkInRecommendations.map((rec, ri) => <li key={ri}>{rec}</li>)}
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
                      <div style={{ fontSize: 9, color: "#444", marginBottom: 2 }}>NOTES</div>
                      <div style={{ fontSize: 12, color: "#aaa", fontStyle: "italic" }}>{s.notes}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
