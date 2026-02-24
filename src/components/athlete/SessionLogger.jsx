import { phaseColor, fmtDate, calcLoad } from "../../lib/helpers.js";
import { Card, Label, Btn, Chk, Plus } from "../ui/index.js";
import CheckInSummaryCard from "./CheckInSummaryCard.jsx";

export default function SessionLogger({
  activeSession,
  identity,
  updateSet,
  toggleDone,
  addSet,
  setActiveSession,
  onFinish,
  onDiscard,
  syncing,
  syncError,
  setSyncError,
  pct,
}) {
  if (!activeSession) return null;
  return (
    <div>
      <div
        style={{
          background: "#111",
          border: `1px solid ${phaseColor(activeSession.phase)}33`,
          borderRadius: 10,
          padding: "12px 14px",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            color: phaseColor(activeSession.phase),
            fontWeight: "bold",
            fontSize: 12,
            letterSpacing: 1,
          }}
        >
          PHASE {activeSession.phase} — {activeSession.type === "lift" ? "LIFT DAY" : "SPEED DAY"}
        </div>
        <div style={{ color: "#555", fontSize: 11, marginTop: 2 }}>
          {fmtDate(activeSession.date)} · {identity.position}
        </div>
      </div>

      <CheckInSummaryCard checkIn={activeSession.checkIn} checkInRecommendations={activeSession.checkInRecommendations} />

      {activeSession.exercises.map((ex, ei) => {
        const doneN = ex.sets_data.filter((s) => s.done).length;
        const allDone = doneN === ex.sets_data.length;
        return (
          <div
            key={ei}
            style={{
              background: allDone ? "#091509" : "#111",
              border: `1px solid ${allDone ? "#2E7D5233" : "#1e1e1e"}`,
              borderRadius: 10,
              marginBottom: 10,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "11px 14px",
                borderBottom: "1px solid #161616",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: "bold", color: allDone ? "#6BCF7F" : "#e0e0e0" }}>{ex.name}</div>
                <div style={{ fontSize: 11, color: "#444", marginTop: 2 }}>
                  {ex.sets}×{ex.reps}
                  {ex.tempo ? ` · ${ex.tempo}` : ""}
                </div>
              </div>
              <div style={{ fontSize: 12, color: allDone ? "#6BCF7F" : "#444", fontWeight: "bold" }}>
                {doneN}/{ex.sets_data.length}
              </div>
            </div>

            <div style={{ padding: "10px 14px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "24px 1fr 1fr 32px", gap: 5, marginBottom: 5 }}>
                <div style={{ fontSize: 9, color: "#333", textAlign: "center" }}>#</div>
                <div style={{ fontSize: 9, color: "#333", textAlign: "center" }}>WEIGHT (lbs)</div>
                <div style={{ fontSize: 9, color: "#333", textAlign: "center" }}>REPS / RESULT</div>
                <div />
              </div>
              {ex.sets_data.map((s, si) => (
                <div
                  key={si}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "24px 1fr 1fr 32px",
                    gap: 5,
                    marginBottom: 5,
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      color: s.done ? "#6BCF7F" : "#444",
                      textAlign: "center",
                      fontWeight: "bold",
                    }}
                  >
                    {s.done ? "✓" : si + 1}
                  </div>
                  <input
                    value={s.weight}
                    onChange={(e) => updateSet(ei, si, "weight", e.target.value)}
                    placeholder="lbs / kg"
                    style={{
                      padding: "8px",
                      background: s.done ? "#0d2010" : "#1a1a1a",
                      border: `1px solid ${s.done ? "#2E7D5244" : "#252525"}`,
                      borderRadius: 6,
                      color: "#fff",
                      fontFamily: "inherit",
                      fontSize: 15,
                      textAlign: "center",
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                  />
                  <input
                    value={s.reps}
                    onChange={(e) => updateSet(ei, si, "reps", e.target.value)}
                    placeholder="reps"
                    style={{
                      padding: "8px",
                      background: s.done ? "#0d2010" : "#1a1a1a",
                      border: `1px solid ${s.done ? "#2E7D5244" : "#252525"}`,
                      borderRadius: 6,
                      color: "#fff",
                      fontFamily: "inherit",
                      fontSize: 15,
                      textAlign: "center",
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                  />
                  <button
                    onClick={() => toggleDone(ei, si)}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 6,
                      background: s.done ? "#2E7D52" : "#1a1a1a",
                      border: `1px solid ${s.done ? "#2E7D52" : "#2a2a2a"}`,
                      color: s.done ? "#fff" : "#333",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Chk />
                  </button>
                </div>
              ))}
              <button
                onClick={() => addSet(ei)}
                style={{
                  marginTop: 4,
                  padding: "5px 10px",
                  background: "none",
                  border: "1px dashed #2a2a2a",
                  borderRadius: 6,
                  color: "#444",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 11,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Plus /> Add Set
              </button>
            </div>
          </div>
        );
      })}

      <Card style={{ padding: 14, marginBottom: 14 }}>
        <Label>Session Wrap-Up</Label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 10, color: "#555", marginBottom: 4 }}>HOW HARD? (1–10)</div>
            <input
              type="number"
              min="1"
              max="10"
              value={activeSession.rpe}
              onChange={(e) => setActiveSession((p) => ({ ...p, rpe: e.target.value }))}
              placeholder="RPE"
              style={{
                width: "100%",
                padding: "10px",
                background: "#1a1a1a",
                border: "1px solid #2a2a2a",
                borderRadius: 7,
                color: "#fff",
                fontFamily: "inherit",
                fontSize: 18,
                textAlign: "center",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div>
            <div style={{ fontSize: 10, color: "#555", marginBottom: 4 }}>HOW LONG? (min)</div>
            <input
              type="number"
              value={activeSession.duration}
              onChange={(e) => setActiveSession((p) => ({ ...p, duration: e.target.value }))}
              placeholder="mins"
              style={{
                width: "100%",
                padding: "10px",
                background: "#1a1a1a",
                border: "1px solid #2a2a2a",
                borderRadius: 7,
                color: "#fff",
                fontFamily: "inherit",
                fontSize: 18,
                textAlign: "center",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        {activeSession.rpe && activeSession.duration && (
          <div
            style={{
              background: "#091509",
              border: "1px solid #2E7D5233",
              borderRadius: 7,
              padding: "10px 14px",
              marginBottom: 10,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ fontSize: 12, color: "#666" }}>Load Score (Gabbett)</div>
            <div style={{ fontSize: 22, fontWeight: "bold", color: "#6BCF7F" }}>
              {calcLoad(activeSession.rpe, activeSession.duration)}
              <span style={{ fontSize: 11, color: "#444", marginLeft: 3, fontWeight: "normal" }}>pts</span>
            </div>
          </div>
        )}

        <div>
          <div style={{ fontSize: 10, color: "#555", marginBottom: 4 }}>NOTES (optional — visible to coach)</div>
          <textarea
            value={activeSession.notes}
            onChange={(e) => setActiveSession((p) => ({ ...p, notes: e.target.value }))}
            placeholder="PRs, how it felt, any issues..."
            rows={2}
            style={{
              width: "100%",
              padding: "10px",
              background: "#1a1a1a",
              border: "1px solid #2a2a2a",
              borderRadius: 7,
              color: "#fff",
              fontFamily: "inherit",
              fontSize: 13,
              resize: "none",
              boxSizing: "border-box",
            }}
          />
        </div>
      </Card>

      {syncError && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            marginBottom: 8,
            padding: "8px 12px",
            background: "#2a1000",
            border: "1px solid #C8A43A33",
            borderRadius: 8,
            color: "#e06050",
            fontSize: 12,
          }}
        >
          <span>{syncError}</span>
          <button
            onClick={() => setSyncError(null)}
            style={{ background: "none", border: "none", color: "#e06050", cursor: "pointer", padding: "2px 6px", fontSize: 14 }}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}
      <Btn
        onClick={onFinish}
        disabled={syncing}
        style={{ width: "100%", marginBottom: 8 }}
        color={pct === 100 ? "#2E7D52" : "#C8A43A"}
        text={pct === 100 ? "#fff" : "#0D1F3C"}
      >
        {syncing ? "Syncing to team..." : pct === 100 ? "✓ Save & Sync Session" : `Save Progress (${pct}%)`}
      </Btn>
      <button
        onClick={onDiscard}
        style={{
          width: "100%",
          padding: "11px",
          background: "none",
          border: "1px solid #1e1e1e",
          borderRadius: 8,
          color: "#444",
          fontFamily: "inherit",
          fontSize: 12,
          cursor: "pointer",
        }}
      >
        Discard session
      </button>
    </div>
  );
}
