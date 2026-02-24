import { useState, useEffect } from "react";
import { putProgram } from "../../storage-api-client.js";
import { Card, Label, Btn } from "../ui/index.js";

function ensureTemplatesObj(obj) {
  if (obj && typeof obj === "object" && !Array.isArray(obj)) return obj;
  return {};
}

function ensurePhasesArray(arr) {
  if (Array.isArray(arr)) return arr;
  return [];
}

export default function ProgramEditor({ program, teamCode, onSave, onBack }) {
  const [phases, setPhases] = useState([]);
  const [liftTemplates, setLiftTemplates] = useState({});
  const [speedTemplates, setSpeedTemplates] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setPhases(ensurePhasesArray(program?.phases));
    setLiftTemplates(ensureTemplatesObj(program?.liftTemplates));
    setSpeedTemplates(ensureTemplatesObj(program?.speedTemplates));
  }, [program]);

  const setLiftForPhase = (phaseId, list) => {
    setLiftTemplates(prev => ({ ...prev, [phaseId]: list }));
  };
  const setSpeedForPhase = (phaseId, list) => {
    setSpeedTemplates(prev => ({ ...prev, [phaseId]: list }));
  };

  const updateExercise = (template, setTemplate, phaseId, exIdx, field, value) => {
    const list = [...(template[phaseId] || [])];
    if (!list[exIdx]) return;
    list[exIdx] = { ...list[exIdx], [field]: value };
    setTemplate(phaseId, list);
  };

  const addExercise = (template, setTemplate, phaseId) => {
    const list = [...(template[phaseId] || []), { name: "", sets: 3, reps: "", tempo: "" }];
    setTemplate(phaseId, list);
  };

  const removeExercise = (template, setTemplate, phaseId, exIdx) => {
    const list = (template[phaseId] || []).filter((_, i) => i !== exIdx);
    setTemplate(phaseId, list);
  };

  const moveExercise = (template, setTemplate, phaseId, exIdx, dir) => {
    const list = [...(template[phaseId] || [])];
    const ni = exIdx + dir;
    if (ni < 0 || ni >= list.length) return;
    [list[exIdx], list[ni]] = [list[ni], list[exIdx]];
    setTemplate(phaseId, list);
  };

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      await putProgram(teamCode, { phases, liftTemplates, speedTemplates });
      onSave();
    } catch (e) {
      setError(e?.message || e?.data?.error || "Failed to save program");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", fontFamily: "Georgia, serif", color: "#f0f0f0", maxWidth: 520, margin: "0 auto", paddingBottom: 60 }}>
      <div style={{ background: "#1a0000", borderBottom: "2px solid #922B21", padding: "12px 16px", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button onClick={onBack} style={{ background: "none", border: "none", color: "#e06050", cursor: "pointer", fontSize: 18 }} aria-label="Back">←</button>
          <span style={{ color: "#e06050", fontWeight: "bold", fontSize: 15 }}>Edit program</span>
          <span style={{ width: 24 }} />
        </div>
      </div>
      <div style={{ padding: "14px" }}>
        <p style={{ fontSize: 12, color: "#888", marginBottom: 14 }}>
          Change the workout list for each phase. Athletes will see this when they start a session.
        </p>
        {error && (
          <div style={{ padding: "10px 12px", background: "#2a0000", border: "1px solid #922B2133", borderRadius: 8, color: "#e06050", fontSize: 13, marginBottom: 14 }}>
            {error}
          </div>
        )}
        {phases.map(ph => (
          <Card key={ph.id} style={{ marginBottom: 20, border: `1px solid ${ph.color}33`, overflow: "hidden" }}>
            <div style={{ background: `${ph.color}18`, padding: "10px 14px", borderBottom: `1px solid ${ph.color}33` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 3, height: 24, background: ph.color, borderRadius: 2 }} />
                <span style={{ fontWeight: "bold", color: "#fff" }}>{ph.label} — {ph.name}</span>
              </div>
            </div>
            <div style={{ padding: "12px 14px" }}>
              <Label style={{ marginBottom: 8 }}>Lift</Label>
              {(liftTemplates[ph.id] || []).map((ex, ei) => (
                <div key={ei} style={{ display: "grid", gridTemplateColumns: "1fr 60px 80px 100px auto auto", gap: 6, alignItems: "center", marginBottom: 6 }}>
                  <input
                    value={ex.name}
                    onChange={e => updateExercise(liftTemplates, setLiftForPhase, ph.id, ei, "name", e.target.value)}
                    placeholder="Exercise name"
                    style={{ padding: "6px 8px", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 6, color: "#fff", fontFamily: "inherit", fontSize: 12 }}
                  />
                  <input
                    type="number"
                    min={1}
                    value={ex.sets ?? ""}
                    onChange={e => updateExercise(liftTemplates, setLiftForPhase, ph.id, ei, "sets", e.target.value === "" ? "" : parseInt(e.target.value, 10))}
                    placeholder="Sets"
                    style={{ padding: "6px 8px", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 6, color: "#fff", fontFamily: "inherit", fontSize: 12 }}
                  />
                  <input
                    value={ex.reps ?? ""}
                    onChange={e => updateExercise(liftTemplates, setLiftForPhase, ph.id, ei, "reps", e.target.value)}
                    placeholder="Reps"
                    style={{ padding: "6px 8px", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 6, color: "#fff", fontFamily: "inherit", fontSize: 12 }}
                  />
                  <input
                    value={ex.tempo ?? ""}
                    onChange={e => updateExercise(liftTemplates, setLiftForPhase, ph.id, ei, "tempo", e.target.value)}
                    placeholder="Tempo"
                    style={{ padding: "6px 8px", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 6, color: "#fff", fontFamily: "inherit", fontSize: 12 }}
                  />
                  <div style={{ display: "flex", gap: 4 }}>
                    <button type="button" onClick={() => moveExercise(liftTemplates, setLiftForPhase, ph.id, ei, -1)} disabled={ei === 0} style={{ padding: "4px 8px", background: "#1a1a1a", border: "1px solid #333", borderRadius: 4, color: "#888", cursor: ei === 0 ? "default" : "pointer", fontSize: 11 }}>↑</button>
                    <button type="button" onClick={() => moveExercise(liftTemplates, setLiftForPhase, ph.id, ei, 1)} disabled={ei === (liftTemplates[ph.id] || []).length - 1} style={{ padding: "4px 8px", background: "#1a1a1a", border: "1px solid #333", borderRadius: 4, color: "#888", cursor: "pointer", fontSize: 11 }}>↓</button>
                  </div>
                  <button type="button" onClick={() => removeExercise(liftTemplates, setLiftForPhase, ph.id, ei)} style={{ padding: "4px 8px", background: "#2a0000", border: "1px solid #922B2133", borderRadius: 4, color: "#e06050", cursor: "pointer", fontSize: 11 }}>Remove</button>
                </div>
              ))}
              <button type="button" onClick={() => addExercise(liftTemplates, setLiftForPhase, ph.id)} style={{ marginTop: 6, padding: "6px 12px", background: "none", border: "1px dashed #444", borderRadius: 6, color: "#666", fontFamily: "inherit", fontSize: 12, cursor: "pointer" }}>
                + Add lift exercise
              </button>
            </div>
            <div style={{ padding: "12px 14px", borderTop: "1px solid #1e1e1e" }}>
              <Label style={{ marginBottom: 8 }}>Speed</Label>
              {(speedTemplates[ph.id] || []).map((ex, ei) => (
                <div key={ei} style={{ display: "grid", gridTemplateColumns: "1fr 60px 80px 100px auto auto", gap: 6, alignItems: "center", marginBottom: 6 }}>
                  <input
                    value={ex.name}
                    onChange={e => updateExercise(speedTemplates, setSpeedForPhase, ph.id, ei, "name", e.target.value)}
                    placeholder="Exercise name"
                    style={{ padding: "6px 8px", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 6, color: "#fff", fontFamily: "inherit", fontSize: 12 }}
                  />
                  <input
                    type="number"
                    min={1}
                    value={ex.sets ?? ""}
                    onChange={e => updateExercise(speedTemplates, setSpeedForPhase, ph.id, ei, "sets", e.target.value === "" ? "" : parseInt(e.target.value, 10))}
                    placeholder="Sets"
                    style={{ padding: "6px 8px", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 6, color: "#fff", fontFamily: "inherit", fontSize: 12 }}
                  />
                  <input
                    value={ex.reps ?? ""}
                    onChange={e => updateExercise(speedTemplates, setSpeedForPhase, ph.id, ei, "reps", e.target.value)}
                    placeholder="Reps"
                    style={{ padding: "6px 8px", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 6, color: "#fff", fontFamily: "inherit", fontSize: 12 }}
                  />
                  <input
                    value={ex.tempo ?? ""}
                    onChange={e => updateExercise(speedTemplates, setSpeedForPhase, ph.id, ei, "tempo", e.target.value)}
                    placeholder="Tempo"
                    style={{ padding: "6px 8px", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 6, color: "#fff", fontFamily: "inherit", fontSize: 12 }}
                  />
                  <div style={{ display: "flex", gap: 4 }}>
                    <button type="button" onClick={() => moveExercise(speedTemplates, setSpeedForPhase, ph.id, ei, -1)} disabled={ei === 0} style={{ padding: "4px 8px", background: "#1a1a1a", border: "1px solid #333", borderRadius: 4, color: "#888", cursor: ei === 0 ? "default" : "pointer", fontSize: 11 }}>↑</button>
                    <button type="button" onClick={() => moveExercise(speedTemplates, setSpeedForPhase, ph.id, ei, 1)} disabled={ei === (speedTemplates[ph.id] || []).length - 1} style={{ padding: "4px 8px", background: "#1a1a1a", border: "1px solid #333", borderRadius: 4, color: "#888", cursor: "pointer", fontSize: 11 }}>↓</button>
                  </div>
                  <button type="button" onClick={() => removeExercise(speedTemplates, setSpeedForPhase, ph.id, ei)} style={{ padding: "4px 8px", background: "#2a0000", border: "1px solid #922B2133", borderRadius: 4, color: "#e06050", cursor: "pointer", fontSize: 11 }}>Remove</button>
                </div>
              ))}
              <button type="button" onClick={() => addExercise(speedTemplates, setSpeedForPhase, ph.id)} style={{ marginTop: 6, padding: "6px 12px", background: "none", border: "1px dashed #444", borderRadius: 6, color: "#666", fontFamily: "inherit", fontSize: 12, cursor: "pointer" }}>
                + Add speed exercise
              </button>
            </div>
          </Card>
        ))}
        <Btn onClick={handleSave} disabled={saving} style={{ width: "100%", marginTop: 8 }}>
          {saving ? "Saving..." : "Save program"}
        </Btn>
        <button onClick={onBack} style={{ width: "100%", marginTop: 8, padding: "10px", background: "none", border: "1px solid #2a2a2a", borderRadius: 8, color: "#666", fontFamily: "inherit", fontSize: 12, cursor: "pointer" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}
