import { useState, useEffect } from "react";
import { PHASES } from "../../lib/constants.js";
import { buildExercises, todayStr, makeSessionKey, phaseColor } from "../../lib/helpers.js";
import { isApiAvailable, createSession } from "../../storage-api-client.js";
import { Card, Label, Input, Btn } from "../ui/index.js";
import GroupExerciseGrid from "./GroupExerciseGrid.jsx";
import GroupExerciseSequential from "./GroupExerciseSequential.jsx";

const STORAGE_UI_MODE = "groupSession_uiMode";

export default function GroupSessionEntry({ roster, teamCode, program, onBack, onRefreshNeeded }) {
  const phases = program?.phases && Array.isArray(program.phases) ? program.phases : PHASES;
  const athleteIds = Object.keys(roster).filter(id => id !== "coach");
  const [step, setStep] = useState("selectAthletes");
  const [selectedAthletes, setSelectedAthletes] = useState([]);
  const [quickEntry, setQuickEntry] = useState("");
  const [rosterFilter, setRosterFilter] = useState("");
  const [phase, setPhase] = useState(null);
  const [type, setType] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [currentExerciseIdx, setCurrentExerciseIdx] = useState(0);
  const [currentAthleteIdx, setCurrentAthleteIdx] = useState(0);
  const [uiMode, setUiMode] = useState(() => {
    if (typeof window === "undefined") return "grid";
    return window.localStorage.getItem(STORAGE_UI_MODE) || (window.innerWidth >= 768 ? "grid" : "sequential");
  });
  const [sessionStartTime] = useState(() => new Date().toISOString());
  const [groupRPE, setGroupRPE] = useState("");
  const [groupDuration, setGroupDuration] = useState("");
  const [groupNotes, setGroupNotes] = useState("");
  const [athleteOverrides, setAthleteOverrides] = useState({});
  const [overrideEnabled, setOverrideEnabled] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_UI_MODE, uiMode);
    } catch (_) {}
  }, [uiMode]);

  const parseQuickEntry = () => {
    const nums = quickEntry.split(/[\s,]+/).map(n => n.trim()).filter(Boolean);
    const matched = athleteIds.filter(id => {
      const j = roster[id].jerseyNumber;
      return j != null && nums.includes(String(j).trim());
    });
    setSelectedAthletes(prev => [...new Set([...prev, ...matched])]);
    setQuickEntry("");
  };

  const toggleAthlete = (id) => {
    setSelectedAthletes(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const removeAthlete = (id) => {
    setSelectedAthletes(prev => prev.filter(x => x !== id));
  };

  const startSession = (p, t) => {
    setPhase(p);
    setType(t);
    const base = buildExercises(p, t, program);
    const withAthleteData = base.map(ex => ({
      name: ex.name,
      sets: ex.sets,
      reps: ex.reps,
      tempo: ex.tempo,
      athleteData: Object.fromEntries(
        selectedAthletes.map(aid => [
          aid,
          { sets_data: (ex.sets_data || []).map(s => ({ ...s })) },
        ])
      ),
    }));
    setExercises(withAthleteData);
    setCurrentExerciseIdx(0);
    setCurrentAthleteIdx(0);
    setStep("logExercises");
  };

  const updateSet = (exerciseIdx, athleteId, setIdx, field, val) => {
    setExercises(prev => {
      const ex = [...prev];
      const exCopy = { ...ex[exerciseIdx], athleteData: { ...ex[exerciseIdx].athleteData } };
      const ad = { ...exCopy.athleteData[athleteId] };
      const sets = [...(ad.sets_data || [])];
      sets[setIdx] = { ...sets[setIdx], [field]: val };
      if (field === "weight" || field === "reps") {
        const s = sets[setIdx];
        if (s.weight && s.reps) s.done = true;
      }
      ad.sets_data = sets;
      exCopy.athleteData[athleteId] = ad;
      ex[exerciseIdx] = exCopy;
      return ex;
    });
  };

  const toggleDone = (exerciseIdx, athleteId, setIdx) => {
    setExercises(prev => {
      const ex = [...prev];
      const exCopy = { ...ex[exerciseIdx], athleteData: { ...ex[exerciseIdx].athleteData } };
      const ad = { ...exCopy.athleteData[athleteId] };
      const sets = [...(ad.sets_data || [])];
      sets[setIdx] = { ...sets[setIdx], done: !sets[setIdx].done };
      ad.sets_data = sets;
      exCopy.athleteData[athleteId] = ad;
      ex[exerciseIdx] = exCopy;
      return ex;
    });
  };

  const addSet = (exerciseIdx, athleteId) => {
    setExercises(prev => {
      const ex = [...prev];
      const exCopy = { ...ex[exerciseIdx], athleteData: { ...ex[exerciseIdx].athleteData } };
      const ad = { ...exCopy.athleteData[athleteId] };
      ad.sets_data = [...(ad.sets_data || []), { weight: "", reps: "", done: false }];
      exCopy.athleteData[athleteId] = ad;
      ex[exerciseIdx] = exCopy;
      return ex;
    });
  };

  const setOverride = (athleteId, field, value) => {
    setAthleteOverrides(prev => ({
      ...prev,
      [athleteId]: { ...(prev[athleteId] || {}), [field]: value },
    }));
  };

  const saveAllSessions = async () => {
    setSaving(true);
    setSaveMessage(null);
    const results = [];
    for (const athleteId of selectedAthletes) {
      const athleteExercises = exercises.map(ex => ({
        name: ex.name,
        sets: ex.sets,
        reps: ex.reps,
        tempo: ex.tempo,
        sets_data: (ex.athleteData[athleteId] && ex.athleteData[athleteId].sets_data) || [],
      }));
      const session = {
        id: `${athleteId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        athleteId,
        athleteName: roster[athleteId].name,
        position: roster[athleteId].position,
        grade: roster[athleteId].grade,
        teamCode,
        phase,
        type,
        date: todayStr(),
        exercises: athleteExercises,
        rpe: overrideEnabled[athleteId] ? (athleteOverrides[athleteId]?.rpe ?? groupRPE) : groupRPE,
        duration: overrideEnabled[athleteId] ? (athleteOverrides[athleteId]?.duration ?? groupDuration) : groupDuration,
        notes: overrideEnabled[athleteId] ? (athleteOverrides[athleteId]?.notes ?? groupNotes) : groupNotes,
        startedAt: sessionStartTime,
        completedAt: new Date().toISOString(),
        complete: true,
      };
      try {
        if (isApiAvailable()) {
          await createSession(session);
          results.push({ athleteId, success: true });
        } else {
          const key = makeSessionKey(teamCode, athleteId, session.id);
          await window.storage.set(key, JSON.stringify(session), true);
          const idxKey = `tc:${teamCode}:idx:${athleteId}`;
          let idx = [];
          try {
            const r = await window.storage.get(idxKey, true);
            if (r) idx = JSON.parse(r.value);
          } catch (_) {}
          idx = [session.id, ...idx.filter(x => x !== session.id)].slice(0, 50);
          await window.storage.set(idxKey, JSON.stringify(idx), true);
          results.push({ athleteId, success: true });
        }
      } catch (err) {
        results.push({ athleteId, success: false, error: err.message });
      }
    }
    setSaving(false);
    const ok = results.filter(r => r.success).length;
    const fail = results.filter(r => !r.success).length;
    setSaveMessage(
      fail === 0
        ? `${ok} session${ok !== 1 ? "s" : ""} saved.`
        : `${ok} saved, ${fail} failed.`
    );
    if (onRefreshNeeded) onRefreshNeeded();
    setTimeout(() => {
      onBack();
    }, 1500);
  };

  const filteredRoster = rosterFilter.trim()
    ? athleteIds.filter(id => {
        const a = roster[id];
        const q = rosterFilter.toLowerCase();
        return (
          (a.name && a.name.toLowerCase().includes(q)) ||
          (a.position && a.position.toLowerCase().includes(q)) ||
          (a.jerseyNumber != null && String(a.jerseyNumber).includes(rosterFilter))
        );
      })
    : athleteIds;

  const commonStyles = {
    wrapper: { background: "#0a0a0a", minHeight: "100vh", fontFamily: "Georgia, serif", color: "#f0f0f0", maxWidth: 520, margin: "0 auto", paddingBottom: 80 },
    header: { background: "#1a0000", borderBottom: "2px solid #922B21", padding: "12px 16px", position: "sticky", top: 0, zIndex: 50 },
    backBtn: { background: "none", border: "none", color: "#e06050", cursor: "pointer", padding: 4, display: "flex", alignItems: "center", gap: 6 },
  };

  return (
    <div style={commonStyles.wrapper}>
      <div style={commonStyles.header}>
        <button onClick={onBack} style={commonStyles.backBtn} aria-label="Back">
          <span style={{ fontSize: 18 }}>←</span>
          <span style={{ fontWeight: "bold", fontSize: 15 }}>Group Session</span>
        </button>
      </div>

      <div style={{ padding: "14px" }}>
        {step === "selectAthletes" && (
          <>
            <Label>Step 1: Select Athletes</Label>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: "#555", marginBottom: 6 }}>Quick entry (jersey numbers, comma or space separated)</div>
              <div style={{ display: "flex", gap: 8 }}>
                <Input
                  value={quickEntry}
                  onChange={e => setQuickEntry(e.target.value)}
                  onBlur={parseQuickEntry}
                  placeholder="e.g. 12, 7, 23, 45"
                  style={{ flex: 1 }}
                />
                <button
                  onClick={parseQuickEntry}
                  style={{
                    padding: "10px 16px", background: "#922B21", border: "none", borderRadius: 7,
                    color: "#fff", fontFamily: "inherit", fontSize: 13, cursor: "pointer", fontWeight: "bold",
                  }}
                >
                  Add
                </button>
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: "#555", marginBottom: 6 }}>Or select from roster</div>
              <Input
                value={rosterFilter}
                onChange={e => setRosterFilter(e.target.value)}
                placeholder="Search name, position, or number..."
                style={{ marginBottom: 8 }}
              />
              <div style={{ maxHeight: 220, overflowY: "auto", border: "1px solid #222", borderRadius: 8, padding: 4 }}>
                {filteredRoster.map(id => {
                  const a = roster[id];
                  const checked = selectedAthletes.includes(id);
                  return (
                    <label
                      key={id}
                      style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
                        cursor: "pointer", background: checked ? "#922B2118" : "transparent", borderRadius: 6,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleAthlete(id)}
                        style={{ width: 18, height: 18 }}
                      />
                      <span style={{ fontWeight: "bold", color: "#e0e0e0" }}>{a.name}</span>
                      {a.jerseyNumber != null && a.jerseyNumber !== "" && (
                        <span style={{ color: "#888", fontSize: 12 }}>#{a.jerseyNumber}</span>
                      )}
                      <span style={{ color: "#555", fontSize: 12 }}>
                        {[a.position, a.level === "varsity" ? "Varsity" : a.level === "junior_varsity" ? "JV" : null].filter(Boolean).join(" · ")}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
            {selectedAthletes.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: "#555", marginBottom: 6 }}>
                  Selected ({selectedAthletes.length}): {selectedAthletes.map(id => roster[id].name).join(", ")}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {selectedAthletes.map(id => (
                    <span
                      key={id}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        padding: "6px 10px", background: "#111", border: "1px solid #333",
                        borderRadius: 6, fontSize: 12,
                      }}
                    >
                      {roster[id].name}
                      {roster[id].jerseyNumber != null && roster[id].jerseyNumber !== "" && ` #${roster[id].jerseyNumber}`}
                      <button
                        type="button"
                        onClick={() => removeAthlete(id)}
                        style={{ background: "none", border: "none", color: "#888", cursor: "pointer", padding: 0, fontSize: 16, lineHeight: 1 }}
                        aria-label="Remove"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
            <button
              onClick={() => setStep("pickSession")}
              disabled={selectedAthletes.length === 0}
              style={{
                width: "100%", padding: "14px", background: selectedAthletes.length === 0 ? "#222" : "#922B21",
                border: "none", borderRadius: 8, color: selectedAthletes.length === 0 ? "#444" : "#fff",
                fontFamily: "inherit", fontSize: 14, cursor: selectedAthletes.length === 0 ? "default" : "pointer", fontWeight: "bold",
              }}
            >
              Next: Pick Session Type ({selectedAthletes.length} athlete{selectedAthletes.length !== 1 ? "s" : ""})
            </button>
          </>
        )}

        {step === "pickSession" && (
          <>
            <button onClick={() => setStep("selectAthletes")} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", marginBottom: 14, fontSize: 13 }}>
              ← Back to athletes
            </button>
            <Label>Step 2: Pick Phase + Session Type</Label>
            <div style={{ fontSize: 11, color: "#555", marginBottom: 10 }}>{selectedAthletes.length} athletes selected</div>
            {phases.map(ph => (
              <div key={ph.id} style={{ background: "#111", border: `1px solid ${ph.color}33`, borderRadius: 10, marginBottom: 10, overflow: "hidden" }}>
                <div style={{ background: `${ph.color}18`, borderBottom: `1px solid ${ph.color}33`, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 3, height: 28, background: ph.color, borderRadius: 2 }} />
                  <div>
                    <div style={{ color: "#fff", fontWeight: "bold", fontSize: 14 }}>{ph.label} — {ph.name}</div>
                    <div style={{ color: "#666", fontSize: 11 }}>{ph.weeks}</div>
                  </div>
                </div>
                <div style={{ display: "flex" }}>
                  {[["lift", "LIFT", "M / W / F"], ["speed", "SPEED", "T / TH"]].map(([t, label, days]) => (
                    <button
                      key={t}
                      onClick={() => startSession(ph.id, t)}
                      style={{
                        flex: 1, padding: "14px 8px", background: "none", border: "none",
                        borderRight: t === "lift" ? "1px solid #1e1e1e" : "none",
                        cursor: "pointer", fontFamily: "inherit",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = `${ph.color}18`; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
                    >
                      <div style={{ fontSize: 11, fontWeight: "bold", color: ph.color, letterSpacing: 1 }}>{label}</div>
                      <div style={{ fontSize: 10, color: "#444", marginTop: 2 }}>{days}</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {step === "logExercises" && exercises.length > 0 && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
              <button onClick={() => setStep("pickSession")} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 13 }}>
                ← Back
              </button>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, color: "#555" }}>View:</span>
                  <button
                    onClick={() => setUiMode("grid")}
                    style={{
                      padding: "6px 12px", borderRadius: 6, fontFamily: "inherit", fontSize: 12,
                      background: uiMode === "grid" ? "#922B21" : "#1a1a1a",
                      border: `1px solid ${uiMode === "grid" ? "#922B21" : "#333"}`,
                      color: uiMode === "grid" ? "#fff" : "#888", cursor: "pointer",
                    }}
                  >
                    Grid
                  </button>
                  <button
                    onClick={() => setUiMode("sequential")}
                    style={{
                      padding: "6px 12px", borderRadius: 6, fontFamily: "inherit", fontSize: 12,
                      background: uiMode === "sequential" ? "#922B21" : "#1a1a1a",
                      border: `1px solid ${uiMode === "sequential" ? "#922B21" : "#333"}`,
                      color: uiMode === "sequential" ? "#fff" : "#888", cursor: "pointer",
                    }}
                  >
                    One at a time
                  </button>
                </div>
                <div style={{ fontSize: 10, color: "#444", marginTop: 4 }}>On small screens, use One at a time for easier entry.</div>
              </div>
            </div>
            <div style={{ background: "#111", border: `1px solid ${phaseColor(phase, program)}33`, borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
              <div style={{ color: phaseColor(phase, program), fontWeight: "bold", fontSize: 12 }}>
                PHASE {phase} — {type === "lift" ? "LIFT" : "SPEED"} · Exercise {currentExerciseIdx + 1} of {exercises.length}
              </div>
            </div>
            {uiMode === "grid" ? (
              <GroupExerciseGrid
                exercise={exercises[currentExerciseIdx]}
                selectedAthletes={selectedAthletes}
                roster={roster}
                onUpdateSet={updateSet}
                onToggleDone={toggleDone}
                exerciseIdx={currentExerciseIdx}
                onPrevExercise={() => setCurrentExerciseIdx(i => Math.max(0, i - 1))}
                onNextExercise={() => setCurrentExerciseIdx(i => Math.min(exercises.length - 1, i + 1))}
                canPrev={currentExerciseIdx > 0}
                canNext={currentExerciseIdx < exercises.length - 1}
              />
            ) : (
              <GroupExerciseSequential
                exercise={exercises[currentExerciseIdx]}
                selectedAthletes={selectedAthletes}
                roster={roster}
                currentAthleteIdx={currentAthleteIdx}
                onUpdateSet={updateSet}
                onToggleDone={toggleDone}
                onAddSet={addSet}
                exerciseIdx={currentExerciseIdx}
                onPrevAthlete={() => setCurrentAthleteIdx(i => Math.max(0, i - 1))}
                onNextAthlete={() => setCurrentAthleteIdx(i => Math.min(selectedAthletes.length - 1, i + 1))}
                onPrevExercise={() => setCurrentExerciseIdx(i => Math.max(0, i - 1))}
                onNextExercise={() => setCurrentExerciseIdx(i => Math.min(exercises.length - 1, i + 1))}
                canPrevEx={currentExerciseIdx > 0}
                canNextEx={currentExerciseIdx < exercises.length - 1}
                canPrevAth={currentAthleteIdx > 0}
                canNextAth={currentAthleteIdx < selectedAthletes.length - 1}
              />
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button
                onClick={() => setStep("wrapUp")}
                style={{
                  flex: 1, padding: "14px", background: "#2E7D52", border: "none", borderRadius: 8,
                  color: "#fff", fontFamily: "inherit", fontSize: 14, fontWeight: "bold", cursor: "pointer",
                }}
              >
                Continue to Wrap-Up →
              </button>
            </div>
          </>
        )}

        {step === "wrapUp" && (
          <>
            <button onClick={() => setStep("logExercises")} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", marginBottom: 14, fontSize: 13 }}>
              ← Back to exercises
            </button>
            <Label>Step 4: Session Wrap-Up</Label>
            <Card style={{ padding: 14, marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: "#555", marginBottom: 8 }}>Default for all athletes</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 10, color: "#555", marginBottom: 4 }}>RPE (1–10)</div>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={groupRPE}
                    onChange={e => setGroupRPE(e.target.value)}
                    placeholder="e.g. 8"
                    style={{ width: "100%", padding: "10px", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 7, color: "#fff", fontFamily: "inherit", fontSize: 18, textAlign: "center", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#555", marginBottom: 4 }}>Duration (mins)</div>
                  <input
                    type="number"
                    value={groupDuration}
                    onChange={e => setGroupDuration(e.target.value)}
                    placeholder="e.g. 60"
                    style={{ width: "100%", padding: "10px", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 7, color: "#fff", fontFamily: "inherit", fontSize: 18, textAlign: "center", boxSizing: "border-box" }}
                  />
                </div>
              </div>
              <div style={{ fontSize: 10, color: "#555", marginBottom: 4 }}>Group notes (optional)</div>
              <textarea
                value={groupNotes}
                onChange={e => setGroupNotes(e.target.value)}
                placeholder="Optional notes for all..."
                rows={2}
                style={{ width: "100%", padding: "10px", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 7, color: "#fff", fontFamily: "inherit", fontSize: 13, resize: "none", boxSizing: "border-box", marginBottom: 14 }}
              />
            </Card>
            <Label>Individual overrides (optional)</Label>
            <div style={{ marginBottom: 14 }}>
              {selectedAthletes.map(id => {
                const a = roster[id];
                const enabled = overrideEnabled[id];
                return (
                  <div
                    key={id}
                    style={{
                      background: enabled ? "#922B2112" : "#111",
                      border: "1px solid #222",
                      borderRadius: 8,
                      padding: "10px 12px",
                      marginBottom: 8,
                    }}
                  >
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: enabled ? 8 : 0 }}>
                      <input
                        type="checkbox"
                        checked={!!enabled}
                        onChange={e => setOverrideEnabled(prev => ({ ...prev, [id]: e.target.checked }))}
                        style={{ width: 18, height: 18 }}
                      />
                      <span style={{ fontWeight: "bold", color: "#e0e0e0" }}>{a.name}</span>
                      {a.jerseyNumber != null && a.jerseyNumber !== "" && <span style={{ color: "#888" }}>#{a.jerseyNumber}</span>}
                    </label>
                    {enabled && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 8 }}>
                        <div>
                          <div style={{ fontSize: 9, color: "#555" }}>RPE</div>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={athleteOverrides[id]?.rpe ?? ""}
                            onChange={e => setOverride(id, "rpe", e.target.value)}
                            placeholder={groupRPE || "—"}
                            style={{ width: "100%", padding: "6px", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 6, color: "#fff", fontFamily: "inherit", fontSize: 14, boxSizing: "border-box" }}
                          />
                        </div>
                        <div>
                          <div style={{ fontSize: 9, color: "#555" }}>Duration</div>
                          <input
                            type="number"
                            value={athleteOverrides[id]?.duration ?? ""}
                            onChange={e => setOverride(id, "duration", e.target.value)}
                            placeholder={groupDuration || "—"}
                            style={{ width: "100%", padding: "6px", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 6, color: "#fff", fontFamily: "inherit", fontSize: 14, boxSizing: "border-box" }}
                          />
                        </div>
                        <div style={{ gridColumn: "1 / -1" }}>
                          <div style={{ fontSize: 9, color: "#555" }}>Notes</div>
                          <input
                            type="text"
                            value={athleteOverrides[id]?.notes ?? ""}
                            onChange={e => setOverride(id, "notes", e.target.value)}
                            placeholder="Optional"
                            style={{ width: "100%", padding: "6px", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 6, color: "#fff", fontFamily: "inherit", fontSize: 14, boxSizing: "border-box" }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {saveMessage && (
              <div style={{ padding: "10px 14px", background: "#091509", border: "1px solid #2E7D5233", borderRadius: 8, color: "#6BCF7F", marginBottom: 10 }}>
                {saveMessage}
              </div>
            )}
            <Btn
              onClick={saveAllSessions}
              disabled={saving}
              style={{ width: "100%", marginBottom: 8 }}
              color="#2E7D52"
              text="#fff"
            >
              {saving ? "Saving..." : `Save All ${selectedAthletes.length} Sessions`}
            </Btn>
          </>
        )}
      </div>
    </div>
  );
}
