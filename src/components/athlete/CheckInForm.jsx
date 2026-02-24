import { useState } from "react";
import { Card, Label, Input, Btn } from "../ui/index.js";
import { validateCheckIn } from "../../lib/checkIn.js";

const SCALE_QUESTIONS = [
  { key: "sleep", label: "How did you sleep last night? (1–10)", low: "1 = terrible", high: "10 = perfect", hint: "Below 6: reduce session intensity by 10–15%" },
  { key: "soreness", label: "How sore are your muscles today? (1–10)", low: "1 = fine", high: "10 = extremely sore", hint: "Above 7: substitute heavy compounds with lighter accessory work" },
  { key: "mood", label: "How is your mood and energy today? (1–10)", low: "1 = exhausted", high: "10 = ready to go", hint: "Below 5: talk to the athlete — stress outside the gym affects adaptation" },
  { key: "motivation", label: "Rate your motivation to train today (1–10)", low: "1 = do not want to be here", high: "10 = ready", hint: "Consistent low scores = overtraining signal — consider a rest day" },
];

export default function CheckInForm({ onSubmit, onCancel }) {
  const [sleep, setSleep] = useState("");
  const [soreness, setSoreness] = useState("");
  const [mood, setMood] = useState("");
  const [motivation, setMotivation] = useState("");
  const [painYesNo, setPainYesNo] = useState(null);
  const [painArea, setPainArea] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    setError("");
    const result = validateCheckIn({
      sleep: sleep === "" ? null : Number(sleep),
      soreness: soreness === "" ? null : Number(soreness),
      mood: mood === "" ? null : Number(mood),
      motivation: motivation === "" ? null : Number(motivation),
      painYesNo,
    });
    if (!result.valid) {
      setError(result.error);
      return;
    }
    onSubmit({
      sleep: Number(sleep),
      soreness: Number(soreness),
      mood: Number(mood),
      motivation: Number(motivation),
      painYesNo: painYesNo === true,
      painArea: painYesNo ? painArea.trim() || undefined : undefined,
      completedAt: new Date().toISOString(),
    });
  };

  return (
    <Card style={{ padding: 16, marginBottom: 16 }}>
      <div style={{ fontSize: 12, color: "#C8A43A", letterSpacing: 1, marginBottom: 14 }}>PRE-SESSION CHECK-IN</div>
      {SCALE_QUESTIONS.map(({ key, label, low, high, hint }) => (
        <div key={key} style={{ marginBottom: 14 }}>
          <Label>{label}</Label>
          <div style={{ fontSize: 10, color: "#444", marginBottom: 4 }}>{low} … {high}</div>
          <input
            type="number"
            min={1}
            max={10}
            value={key === "sleep" ? sleep : key === "soreness" ? soreness : key === "mood" ? mood : motivation}
            onChange={e => {
              const v = e.target.value;
              if (key === "sleep") setSleep(v);
              else if (key === "soreness") setSoreness(v);
              else if (key === "mood") setMood(v);
              else setMotivation(v);
            }}
            placeholder="1–10"
            style={{
              width: "100%", padding: "10px 12px", background: "#1a1a1a",
              border: "1px solid #2a2a2a", borderRadius: 7, color: "#fff",
              fontFamily: "inherit", fontSize: 15, boxSizing: "border-box",
            }}
          />
          <div style={{ fontSize: 10, color: "#555", marginTop: 4 }}>{hint}</div>
        </div>
      ))}
      <div style={{ marginBottom: 14 }}>
        <Label>Any pain or soreness in a specific area?</Label>
        <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
          <button
            type="button"
            onClick={() => setPainYesNo(true)}
            style={{
              flex: 1, padding: "10px", borderRadius: 8, fontFamily: "inherit", fontSize: 14,
              cursor: "pointer", border: `1px solid ${painYesNo === true ? "#e06050" : "#2a2a2a"}`,
              background: painYesNo === true ? "#e0605022" : "#1a1a1a",
              color: painYesNo === true ? "#e06050" : "#777",
            }}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => setPainYesNo(false)}
            style={{
              flex: 1, padding: "10px", borderRadius: 8, fontFamily: "inherit", fontSize: 14,
              cursor: "pointer", border: `1px solid ${painYesNo === false ? "#2E7D52" : "#2a2a2a"}`,
              background: painYesNo === false ? "#2E7D5222" : "#1a1a1a",
              color: painYesNo === false ? "#2E7D52" : "#777",
            }}
          >
            No
          </button>
        </div>
        <div style={{ fontSize: 10, color: "#444", marginTop: 4 }}>Any joint pain stops that exercise immediately — coaches must investigate.</div>
      </div>
      {painYesNo === true && (
        <div style={{ marginBottom: 14 }}>
          <Label>Where? (e.g. knee, shoulder)</Label>
          <Input
            value={painArea}
            onChange={e => setPainArea(e.target.value)}
            placeholder="Optional"
          />
        </div>
      )}
      {error && <div style={{ color: "#e06050", fontSize: 13, marginBottom: 10 }}>{error}</div>}
      <div style={{ display: "flex", gap: 10 }}>
        <Btn onClick={onCancel} color="#333" text="#aaa" style={{ flex: 1 }}>Back</Btn>
        <Btn onClick={handleSubmit} style={{ flex: 2 }}>Start session</Btn>
      </div>
    </Card>
  );
}
