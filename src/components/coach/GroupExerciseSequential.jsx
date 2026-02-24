import { Chk, Plus } from "../ui/index.js";

const inputStyle = (done) => ({
  padding: "8px 10px",
  background: done ? "#0d2010" : "#1a1a1a",
  border: `1px solid ${done ? "#2E7D5244" : "#252525"}`,
  borderRadius: 6,
  color: "#fff",
  fontFamily: "inherit",
  fontSize: 15,
  textAlign: "center",
  width: "100%",
  boxSizing: "border-box",
});

export default function GroupExerciseSequential({
  exercise,
  selectedAthletes,
  roster,
  currentAthleteIdx,
  onUpdateSet,
  onToggleDone,
  onAddSet,
  exerciseIdx,
  onPrevAthlete,
  onNextAthlete,
  onPrevExercise,
  onNextExercise,
  canPrevEx,
  canNextEx,
  canPrevAth,
  canNextAth,
}) {
  if (!exercise || !exercise.athleteData || selectedAthletes.length === 0)
    return null;
  const athleteId = selectedAthletes[currentAthleteIdx];
  const a = roster[athleteId];
  const setsData = exercise.athleteData[athleteId]?.sets_data || [];

  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          background: "#111",
          border: "1px solid #1e1e1e",
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "11px 14px",
            borderBottom: "1px solid #161616",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: "bold", color: "#e0e0e0" }}>
            {exercise.name}
          </div>
          <div style={{ fontSize: 11, color: "#444", marginTop: 2 }}>
            {exercise.sets}×{exercise.reps}
            {exercise.tempo ? ` · ${exercise.tempo}` : ""}
          </div>
          <div
            style={{
              fontSize: 12,
              color: "#922B21",
              marginTop: 8,
              fontWeight: "bold",
            }}
          >
            {a.name}
            {a.jerseyNumber != null && a.jerseyNumber !== ""
              ? ` #${a.jerseyNumber}`
              : ""}{" "}
            — Athlete {currentAthleteIdx + 1} of {selectedAthletes.length}
          </div>
        </div>
        <div style={{ padding: "10px 14px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "24px 1fr 1fr 32px",
              gap: 6,
              marginBottom: 6,
              alignItems: "center",
            }}
          >
            <div style={{ fontSize: 9, color: "#333", textAlign: "center" }}>
              #
            </div>
            <div style={{ fontSize: 9, color: "#333", textAlign: "center" }}>
              WEIGHT
            </div>
            <div style={{ fontSize: 9, color: "#333", textAlign: "center" }}>
              REPS
            </div>
            <div />
          </div>
          {setsData.map((s, si) => (
            <div
              key={si}
              style={{
                display: "grid",
                gridTemplateColumns: "24px 1fr 1fr 32px",
                gap: 6,
                marginBottom: 6,
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
                onChange={e =>
                  onUpdateSet(exerciseIdx, athleteId, si, "weight", e.target.value)
                }
                placeholder="lbs"
                style={inputStyle(s.done)}
              />
              <input
                value={s.reps}
                onChange={e =>
                  onUpdateSet(exerciseIdx, athleteId, si, "reps", e.target.value)
                }
                placeholder="reps"
                style={inputStyle(s.done)}
              />
              <button
                onClick={() => onToggleDone(exerciseIdx, athleteId, si)}
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
                aria-label={s.done ? "Mark not done" : "Mark done"}
              >
                <Chk />
              </button>
            </div>
          ))}
          <button
            onClick={() => onAddSet(exerciseIdx, athleteId)}
            style={{
              marginTop: 6,
              padding: "6px 10px",
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
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginTop: 12,
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onPrevAthlete}
            disabled={!canPrevAth}
            style={{
              padding: "10px 14px",
              background: canPrevAth ? "#1a1a1a" : "#111",
              border: "1px solid #333",
              borderRadius: 8,
              color: canPrevAth ? "#e0e0e0" : "#444",
              fontFamily: "inherit",
              fontSize: 12,
              cursor: canPrevAth ? "pointer" : "default",
            }}
          >
            ← Prev Athlete
          </button>
          <button
            onClick={onNextAthlete}
            disabled={!canNextAth}
            style={{
              padding: "10px 14px",
              background: canNextAth ? "#1a1a1a" : "#111",
              border: "1px solid #333",
              borderRadius: 8,
              color: canNextAth ? "#e0e0e0" : "#444",
              fontFamily: "inherit",
              fontSize: 12,
              cursor: canNextAth ? "pointer" : "default",
            }}
          >
            Next Athlete →
          </button>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onPrevExercise}
            disabled={!canPrevEx}
            style={{
              padding: "10px 14px",
              background: canPrevEx ? "#1a1a1a" : "#111",
              border: "1px solid #333",
              borderRadius: 8,
              color: canPrevEx ? "#e0e0e0" : "#444",
              fontFamily: "inherit",
              fontSize: 12,
              cursor: canPrevEx ? "pointer" : "default",
            }}
          >
            ← Prev Ex
          </button>
          <button
            onClick={onNextExercise}
            disabled={!canNextEx}
            style={{
              padding: "10px 14px",
              background: canNextEx ? "#922B21" : "#111",
              border: `1px solid ${canNextEx ? "#922B21" : "#333"}`,
              borderRadius: 8,
              color: canNextEx ? "#fff" : "#444",
              fontFamily: "inherit",
              fontSize: 12,
              cursor: canNextEx ? "pointer" : "default",
              fontWeight: "bold",
            }}
          >
            Next Ex →
          </button>
        </div>
      </div>
    </div>
  );
}
