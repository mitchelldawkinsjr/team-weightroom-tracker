import { useState } from "react";
import { Shell, Label, Input, Btn, Back } from "./ui/index.js";
import { makeLoginCodeKey } from "../lib/helpers.js";
import { isApiAvailable, redeemLoginCode } from "../storage-api-client.js";

export default function RedeemCode({ onSuccess, onBack }) {
  const [teamCode, setTeamCode] = useState("");
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const raw = String(code).toUpperCase().trim();
    if (!raw || raw.length < 4) return setErr("Enter the 6-character code from your coach.");
    setErr("");
    setLoading(true);
    try {
      if (isApiAvailable()) {
        const teamCodeVal = teamCode.trim().length >= 4 ? teamCode.trim().toUpperCase() : null;
        const data = await redeemLoginCode(raw, teamCodeVal);
        if (data && data.athleteId != null) {
          onSuccess(data);
        } else {
          setErr("Code not found or already used. Ask your coach for a new code.");
        }
        setLoading(false);
        return;
      }
      if (!teamCode.trim() || teamCode.trim().length < 4) {
        setErr("Enter your team code.");
        setLoading(false);
        return;
      }
      const res = await window.storage.get(makeLoginCodeKey(raw), true);
      if (!res) {
        setErr("Code not found or already used. Ask your coach for a new code.");
        setLoading(false);
        return;
      }
      const { identity, expiresAt } = JSON.parse(res.value);
      if (Date.now() > expiresAt) {
        setErr("This code has expired. Ask your coach for a new code.");
        setLoading(false);
        return;
      }
      const expectedTeam = teamCode.trim().toUpperCase();
      if (identity.teamCode !== expectedTeam) {
        setErr("Team code doesn't match this login code. Check and try again.");
        setLoading(false);
        return;
      }
      await window.storage.delete(makeLoginCodeKey(raw));
      onSuccess(identity);
    } catch (e) {
      setErr(e?.data?.error || e?.message || "Something went wrong. Try again.");
    }
    setLoading(false);
  };

  return (
    <Shell>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", padding: 4 }}>
          <Back />
        </button>
        <div style={{ fontSize: 16, fontWeight: "bold", color: "#fff" }}>Log in with coach code</div>
      </div>

      <div style={{ marginBottom: 20, padding: "12px 14px", background: "#111", borderRadius: 8, border: "1px solid #2a2a2a" }}>
        <div style={{ fontSize: 12, color: "#888", lineHeight: 1.5 }}>
          Your coach can generate a one-time code so you can use this device (phone, tablet, etc.) with the same account. Enter the code they give you below.
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <Label>Team code</Label>
          <Input
            value={teamCode}
            onChange={e => setTeamCode(e.target.value.toUpperCase())}
            placeholder="e.g. HAWKS2025"
            style={{ letterSpacing: 2, fontWeight: "bold" }}
          />
        </div>
        <div>
          <Label>Login code (from coach)</Label>
          <Input
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
            placeholder="e.g. AB12CD"
            style={{ letterSpacing: 4, fontFamily: "monospace", fontSize: 18 }}
          />
          <div style={{ fontSize: 11, color: "#444", marginTop: 4 }}>6 characters, valid for 15 minutes</div>
        </div>

        {err && <div style={{ color: "#e06050", fontSize: 13, padding: "8px 12px", background: "#2a0000", borderRadius: 6 }}>{err}</div>}

        <Btn onClick={submit} disabled={loading} style={{ width: "100%", marginTop: 4 }}>
          {loading ? "..." : "Log in on this device →"}
        </Btn>
      </div>
    </Shell>
  );
}
