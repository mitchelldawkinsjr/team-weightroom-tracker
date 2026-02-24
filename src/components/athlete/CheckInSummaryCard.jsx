import { Card, Label } from "../ui/index.js";

export default function CheckInSummaryCard({ checkIn, checkInRecommendations }) {
  if (!checkIn) return null;
  return (
    <Card style={{ padding: 12, marginBottom: 16, border: "1px solid #2E7D5233" }}>
      <Label>PRE-SESSION CHECK-IN</Label>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: "#888" }}>Sleep {checkIn.sleep}</span>
        <span style={{ fontSize: 11, color: "#888" }}>·</span>
        <span style={{ fontSize: 11, color: "#888" }}>Sore {checkIn.soreness}</span>
        <span style={{ fontSize: 11, color: "#888" }}>·</span>
        <span style={{ fontSize: 11, color: "#888" }}>Mood {checkIn.mood}</span>
        <span style={{ fontSize: 11, color: "#888" }}>·</span>
        <span style={{ fontSize: 11, color: "#888" }}>Mot {checkIn.motivation}</span>
      </div>
      {checkIn.painYesNo && (
        <div style={{ fontSize: 12, color: "#e06050", marginBottom: 8 }}>
          Reported pain/soreness: {checkIn.painArea || "Specific area"} — stop that exercise; coach to investigate.
        </div>
      )}
      {checkInRecommendations?.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#aaa" }}>
          {checkInRecommendations.map((rec, i) => <li key={i}>{rec}</li>)}
        </ul>
      )}
    </Card>
  );
}
