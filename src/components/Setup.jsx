import { useState } from "react";
import { Shell, Label, Input, Btn, Back } from "./ui/index.js";
import { makeRosterKey } from "../lib/helpers.js";
import { isApiAvailable, createProfile, getRosterForTeam, claimProfile } from "../storage-api-client.js";

const COACH_PIN = import.meta.env.VITE_COACH_PIN || "COACH2025";

export default function Setup({ onSave, onBack }) {
  const [name, setName] = useState("");
  const [teamCode, setTeamCode] = useState("");
  const [position, setPosition] = useState("");
  const [grade, setGrade] = useState("");
  const [jerseyNumber, setJerseyNumber] = useState("");
  const [isCoach, setIsCoach] = useState(false);
  const [coachPin, setCoachPin] = useState("");
  const [err, setErr] = useState("");

  // Athlete path: roster selection + jersey verify
  const [athleteStep, setAthleteStep] = useState("code"); // 'code' | 'roster' | 'verify'
  const [roster, setRoster] = useState(null); // { roster: {}, showLevelToAthletes } (API) or {} (local)
  const [showLevelToAthletes, setShowLevelToAthletes] = useState(false);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [selectedAthleteId, setSelectedAthleteId] = useState(null);
  const [jerseyVerify, setJerseyVerify] = useState("");
  const [claiming, setClaiming] = useState(false);

  const POSITIONS = ["QB", "RB", "WR", "TE", "OL", "DL", "LB", "DB", "K/P", "Coach"];
  const GRADES = ["8th", "9th", "10th", "11th", "12th"];

  const code = teamCode.trim().toUpperCase();

  const loadRoster = async () => {
    if (!code || code.length < 4) return setErr("Team code must be at least 4 characters.");
    setErr("");
    setRosterLoading(true);
    try {
      if (isApiAvailable()) {
        const res = await getRosterForTeam(code);
        setRoster(res.roster || {});
        setShowLevelToAthletes(res.showLevelToAthletes === true);
      } else {
        const rRes = await window.storage.get(makeRosterKey(code), true);
        const rosterData = rRes?.value ? JSON.parse(rRes.value) : {};
        setRoster(rosterData);
        const settingsKey = `tc:${code}:settings`;
        try {
          const sRes = await window.storage.get(settingsKey, true);
          const settings = sRes?.value ? JSON.parse(sRes.value) : {};
          setShowLevelToAthletes(settings.showLevelToAthletes === true);
        } catch (_) {
          setShowLevelToAthletes(false);
        }
      }
      setAthleteStep("roster");
    } catch (e) {
      setErr(e?.message || "Could not load roster. Check team code.");
    } finally {
      setRosterLoading(false);
    }
  };

  const submitCoach = async () => {
    if (!name.trim()) return setErr("Enter your name.");
    if (!code || code.length < 4) return setErr("Team code must be at least 4 characters.");
    if (coachPin.trim() !== COACH_PIN) return setErr("Incorrect coach PIN. Ask your strength coach.");
    setErr("");
    try {
      const identity = await createProfile({
        name: name.trim(),
        teamCode: code,
        position: "",
        grade: "",
        isCoach: true,
        coachPin: coachPin.trim(),
      });
      onSave(identity);
    } catch (e) {
      setErr(e?.message || "Could not save profile. Try again.");
    }
  };

  const submitAthleteClaim = async () => {
    const rosterObj = roster && typeof roster === "object" && !Array.isArray(roster) ? roster : {};
    const entry = selectedAthleteId ? rosterObj[selectedAthleteId] : null;
    if (!entry) return setErr("Select your name from the list.");
    const rosterJersey = entry.jerseyNumber != null ? String(entry.jerseyNumber).trim() : "";
    const provided = jerseyVerify.trim();
    if (rosterJersey !== provided) return setErr("Jersey number does not match. Try again.");
    setErr("");
    setClaiming(true);
    try {
      if (isApiAvailable()) {
        const identity = await claimProfile(code, selectedAthleteId, jerseyVerify.trim());
        onSave(identity);
        return;
      }
      const identity = {
        athleteId: selectedAthleteId,
        name: entry.name,
        teamCode: code,
        position: entry.position || "",
        grade: entry.grade || "",
        jerseyNumber: entry.jerseyNumber || undefined,
        level: entry.level || undefined,
        isCoach: false,
      };
      onSave(identity);
    } catch (e) {
      setErr(e?.message || "Could not sign in. Try again.");
    } finally {
      setClaiming(false);
    }
  };

  const rosterEntries = roster && typeof roster === "object" && !Array.isArray(roster)
    ? Object.entries(roster).map(([id, a]) => ({ id, ...a }))
    : [];
  const selectedEntry = selectedAthleteId && roster ? roster[selectedAthleteId] : null;

  return (
    <Shell>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", padding: 4 }}>
          <Back />
        </button>
        <div style={{ fontSize: 16, fontWeight: "bold", color: "#fff" }}>Set Up Your Profile</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <Label>Team Code</Label>
          <Input
            value={teamCode}
            onChange={e => setTeamCode(e.target.value.toUpperCase())}
            placeholder="e.g. HAWKS2025"
            style={{ letterSpacing: 2, fontWeight: "bold" }}
          />
          <div style={{ fontSize: 11, color: "#444", marginTop: 4 }}>Your coach gives everyone the same team code.</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "#1a0000", border: "1px solid #922B2133", borderRadius: 8 }}>
          <input type="checkbox" id="coach" checked={isCoach} onChange={e => { setIsCoach(e.target.checked); if (e.target.checked) setAthleteStep("code"); }} style={{ width: 18, height: 18, cursor: "pointer" }} />
          <label htmlFor="coach" style={{ color: "#e06050", fontSize: 14, cursor: "pointer" }}>I am a coach</label>
        </div>

        {isCoach ? (
          <>
            <div>
              <Label>Coach Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
            </div>
            <div>
              <Label>Coach PIN</Label>
              <Input type="password" value={coachPin} onChange={e => setCoachPin(e.target.value)} placeholder="Enter coach PIN" />
              <div style={{ fontSize: 11, color: "#444", marginTop: 4 }}>Ask your strength coach for the PIN.</div>
            </div>
            {err && <div style={{ color: "#e06050", fontSize: 13, padding: "8px 12px", background: "#2a0000", borderRadius: 6 }}>{err}</div>}
            <Btn onClick={submitCoach} style={{ width: "100%", marginTop: 4 }}>Enter Coach Dashboard →</Btn>
          </>
        ) : (
          <>
            {athleteStep === "code" && (
              <>
                {err && <div style={{ color: "#e06050", fontSize: 13, padding: "8px 12px", background: "#2a0000", borderRadius: 6 }}>{err}</div>}
                <Btn onClick={loadRoster} disabled={rosterLoading || code.length < 4} style={{ width: "100%", marginTop: 4 }}>
                  {rosterLoading ? "Loading roster…" : "Continue →"}
                </Btn>
              </>
            )}

            {athleteStep === "roster" && (
              <>
                {rosterEntries.length === 0 ? (
                  <div style={{ color: "#888", fontSize: 14, padding: "12px 0" }}>
                    No players on roster yet. Ask your coach to add you or import the roster.
                  </div>
                ) : (
                  <>
                    <Label>Select your name</Label>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 280, overflowY: "auto" }}>
                      {rosterEntries.map(({ id, name: n, position: p, grade: g, jerseyNumber: j, level: l }) => (
                        <button
                          key={id}
                          onClick={() => { setSelectedAthleteId(id); setAthleteStep("verify"); setJerseyVerify(j != null ? String(j) : ""); }}
                          style={{
                            padding: "12px 14px",
                            textAlign: "left",
                            background: "#1a1a1a",
                            border: "1px solid #2a2a2a",
                            borderRadius: 8,
                            color: "#fff",
                            fontFamily: "inherit",
                            fontSize: 14,
                            cursor: "pointer",
                          }}
                        >
                          <div style={{ fontWeight: "bold" }}>{n}</div>
                          <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>
                            {[p, g, j != null && j !== "" ? `#${j}` : null, showLevelToAthletes && l ? (l === "varsity" ? "Varsity" : l === "junior_varsity" ? "JV" : "") : null].filter(Boolean).join(" · ")}
                          </div>
                        </button>
                      ))}
                    </div>
                    <button onClick={() => { setAthleteStep("code"); setRoster(null); setErr(""); }} style={{ marginTop: 8, background: "none", border: "none", color: "#666", fontSize: 12, cursor: "pointer" }}>
                      ← Different team code
                    </button>
                  </>
                )}
              </>
            )}

            {athleteStep === "verify" && selectedEntry && (
              <>
                <div style={{ padding: "10px 12px", background: "#1a1a1a", borderRadius: 8, fontSize: 13, color: "#aaa" }}>
                  You selected: <strong style={{ color: "#fff" }}>{selectedEntry.name}</strong>
                </div>
                <div>
                  <Label>Enter your jersey number to confirm</Label>
                  <Input
                    value={jerseyVerify}
                    onChange={e => setJerseyVerify(e.target.value)}
                    placeholder={selectedEntry.jerseyNumber != null ? `e.g. ${selectedEntry.jerseyNumber}` : "Jersey number (or leave blank if none)"}
                    type="text"
                    inputMode="numeric"
                  />
                </div>
                {err && <div style={{ color: "#e06050", fontSize: 13, padding: "8px 12px", background: "#2a0000", borderRadius: 6 }}>{err}</div>}
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn onClick={submitAthleteClaim} disabled={claiming} style={{ flex: 1 }}>
                    {claiming ? "Signing in…" : "Join Team →"}
                  </Btn>
                  <button onClick={() => { setAthleteStep("roster"); setSelectedAthleteId(null); setJerseyVerify(""); setErr(""); }} style={{ padding: "12px 16px", background: "#333", border: "none", borderRadius: 8, color: "#aaa", fontFamily: "inherit", fontSize: 13, cursor: "pointer" }}>
                    Back
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </Shell>
  );
}
