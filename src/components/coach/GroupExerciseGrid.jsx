import { Chk } from "../ui/index.js";

const cellInputStyle = (done) => ({
  padding: "6px 4px",
  background: done ? "#0d2010" : "#1a1a1a",
  border: `1px solid ${done ? "#2E7D5244" : "#252525"}`,
  borderRadius: 6,
  color: "#fff",
  fontFamily: "inherit",
  fontSize: 13,
  textAlign: "center",
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box",
});

export default function GroupExerciseGrid({
  exercise,
  selectedAthletes,
  roster,
  onUpdateSet,
  onToggleDone,
  exerciseIdx,
  onPrevExercise,
  onNextExercise,
  canPrev,
  canNext,
}) {
  if (!exercise || !exercise.athleteData) return null;
  const firstAthleteData = selectedAthletes.length
    ? exercise.athleteData[selectedAthletes[0]]?.sets_data
    : [];
  const setsCount =
    firstAthleteData.length ||
    (typeof exercise.sets === "number" ? exercise.sets : 4);

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
        </div>
        <div style={{ overflowX: "auto", padding: "10px 14px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 400 }}>
            <thead>
              <tr>
                <th
                  style={{
                    fontSize: 9,
                    color: "#333",
                    fontWeight: "bold",
                    textAlign: "left",
                    padding: "4px 6px",
                    minWidth: 100,
                  }}
                >
                  Athlete
                </th>
                {Array.from({ length: setsCount }, (_, i) => (
                  <th
                    key={i}
                    style={{
                      fontSize: 9,
                      color: "#333",
                      textAlign: "center",
                      padding: "4px 4px",
                      minWidth: 72,
                    }}
                  >
                    Set {i + 1}
                  </th>
                ))}
                <th style={{ width: 32, padding: 4 }} />
              </tr>
            </thead>
            <tbody>
              {selectedAthletes.map(athleteId => {
                const a = roster[athleteId];
                const setsData =
                  exercise.athleteData[athleteId]?.sets_data || [];
                const padded = Array.from(
                  { length: setsCount },
                  (_, i) => setsData[i] || { weight: "", reps: "", done: false }
                );
                return (
                  <tr key={athleteId}>
                    <td
                      style={{
                        fontSize: 11,
                        fontWeight: "bold",
                        color: "#e0e0e0",
                        padding: "6px 8px",
                        verticalAlign: "middle",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {a.name}
                      {a.jerseyNumber != null && a.jerseyNumber !== ""
                        ? ` #${a.jerseyNumber}`
                        : ""}
                    </td>
                    {padded.map((s, si) => (
                      <td key={si} style={{ padding: 4 }}>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 4,
                          }}
                        >
                          <input
                            value={s.weight}
                            onChange={e =>
                              onUpdateSet(
                                exerciseIdx,
                                athleteId,
                                si,
                                "weight",
                                e.target.value
                              )
                            }
                            placeholder="lbs"
                            style={cellInputStyle(s.done)}
                          />
                          <input
                            value={s.reps}
                            onChange={e =>
                              onUpdateSet(
                                exerciseIdx,
                                athleteId,
                                si,
                                "reps",
                                e.target.value
                              )
                            }
                            placeholder="r"
                            style={cellInputStyle(s.done)}
                          />
                        </div>
                      </td>
                    ))}
                    <td style={{ padding: 4, verticalAlign: "middle" }}>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                          alignItems: "center",
                        }}
                      >
                        {padded.map((s, si) => (
                          <button
                            key={si}
                            onClick={() =>
                              onToggleDone(exerciseIdx, athleteId, si)
                            }
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: 6,
                              background: s.done ? "#2E7D52" : "#1a1a1a",
                              border: `1px solid ${
                                s.done ? "#2E7D52" : "#2a2a2a"
                              }`,
                              color: s.done ? "#fff" : "#333",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                            aria-label={s.done ? "Mark not done" : "Mark done"}
                          >
                            <Chk />
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
          marginTop: 12,
        }}
      >
        <button
          onClick={onPrevExercise}
          disabled={!canPrev}
          style={{
            padding: "10px 16px",
            background: canPrev ? "#1a1a1a" : "#111",
            border: "1px solid #333",
            borderRadius: 8,
            color: canPrev ? "#e0e0e0" : "#444",
            fontFamily: "inherit",
            fontSize: 13,
            cursor: canPrev ? "pointer" : "default",
          }}
        >
          ← Previous Exercise
        </button>
        <button
          onClick={onNextExercise}
          disabled={!canNext}
          style={{
            padding: "10px 16px",
            background: canNext ? "#922B21" : "#111",
            border: `1px solid ${canNext ? "#922B21" : "#333"}`,
            borderRadius: 8,
            color: canNext ? "#fff" : "#444",
            fontFamily: "inherit",
            fontSize: 13,
            cursor: canNext ? "pointer" : "default",
            fontWeight: "bold",
          }}
        >
          Next Exercise →
        </button>
      </div>
    </div>
  );
}
