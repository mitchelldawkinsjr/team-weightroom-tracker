import { useState } from "react";
import { parseRosterCsv } from "../../lib/csvParse.js";
import { makeRosterKey } from "../../lib/helpers.js";
import { isApiAvailable, importRoster } from "../../storage-api-client.js";
import { Card, Label, Btn } from "../ui/index.js";

const PREVIEW_ROWS = 20;

export default function RosterImport({ teamCode, onClose, onSuccess }) {
  const [step, setStep] = useState("upload");
  const [rawCsv, setRawCsv] = useState("");
  const [parsed, setParsed] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result ?? "";
      setRawCsv(text);
      runParse(text);
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  };

  const runParse = (text) => {
    setError(null);
    const out = parseRosterCsv(text || rawCsv);
    setParsed(out);
    if (out.rows.length > 0) setStep("preview");
  };

  const handleImport = async () => {
    if (!parsed || parsed.rows.length === 0) return;
    setImporting(true);
    setError(null);
    try {
      if (isApiAvailable()) {
        const res = await importRoster(teamCode, parsed.rows);
        setResult(res);
        onSuccess?.();
        onClose?.();
        return;
      }
      const rosterKey = makeRosterKey(teamCode);
      let roster = {};
      try {
        const stored = await window.storage.get(rosterKey, true);
        if (stored?.value) roster = JSON.parse(stored.value);
      } catch (_) {}
      const joinedAt = new Date().toISOString();
      for (let i = 0; i < parsed.rows.length; i++) {
        const r = parsed.rows[i];
        const slug = (r.name || "").toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
        const athleteId = r.jersey_number
          ? `${slug}_${r.jersey_number}_${Date.now()}_${i}`
          : `${slug}_${Date.now()}_${i}`;
        roster[athleteId] = {
          name: r.name || "",
          position: r.position || "",
          grade: r.grade || "",
          jerseyNumber: r.jersey_number || undefined,
          level: r.level || undefined,
          joinedAt,
        };
      }
      await window.storage.set(rosterKey, JSON.stringify(roster), true);
      setResult({ imported: parsed.rows.length, updated: 0, errors: [] });
      onSuccess?.();
      onClose?.();
    } catch (err) {
      setError(err?.message || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const rows = parsed?.rows ?? [];
  const previewRows = rows.slice(0, PREVIEW_ROWS);

  return (
    <div style={{ padding: 14, maxWidth: 520, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <Label>Import Roster (CSV)</Label>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 18 }}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {step === "upload" && (
        <Card style={{ padding: 14, marginBottom: 14 }}>
          <Label>Upload file or paste CSV</Label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFile}
            style={{ display: "block", marginBottom: 12, fontSize: 12, color: "#aaa" }}
          />
          <textarea
            placeholder="Or paste CSV here (header row: name, position, grade, jersey_number, level)"
            value={rawCsv}
            onChange={(e) => setRawCsv(e.target.value)}
            onBlur={() => rawCsv.trim() && runParse(rawCsv)}
            rows={8}
            style={{
              width: "100%",
              padding: 10,
              background: "#1a1a1a",
              border: "1px solid #2a2a2a",
              borderRadius: 7,
              color: "#fff",
              fontFamily: "monospace",
              fontSize: 12,
              boxSizing: "border-box",
            }}
          />
          {parsed?.errors?.length > 0 && (
            <div style={{ marginTop: 8, fontSize: 11, color: "#e06050" }}>
              {parsed.errors.map((e, i) => (
                <div key={i}>Row {e.row}: {e.message}</div>
              ))}
            </div>
          )}
          {parsed && rows.length > 0 && (
            <Btn
              style={{ marginTop: 12 }}
              onClick={() => setStep("preview")}
            >
              Preview {rows.length} rows
            </Btn>
          )}
        </Card>
      )}

      {step === "preview" && (
        <>
          <Card style={{ padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: "#555", marginBottom: 8 }}>
              {rows.length} row{rows.length !== 1 ? "s" : ""} to import
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #333", textAlign: "left" }}>
                    <th style={{ padding: "6px 8px", color: "#555" }}>Name</th>
                    <th style={{ padding: "6px 8px", color: "#555" }}>Position</th>
                    <th style={{ padding: "6px 8px", color: "#555" }}>Grade</th>
                    <th style={{ padding: "6px 8px", color: "#555" }}>Jersey</th>
                    <th style={{ padding: "6px 8px", color: "#555" }}>Level</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((r, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #1e1e1e" }}>
                      <td style={{ padding: "6px 8px" }}>{r.name}</td>
                      <td style={{ padding: "6px 8px", color: "#888" }}>{r.position || "—"}</td>
                      <td style={{ padding: "6px 8px", color: "#888" }}>{r.grade || "—"}</td>
                      <td style={{ padding: "6px 8px", color: "#888" }}>{r.jersey_number || "—"}</td>
                      <td style={{ padding: "6px 8px", color: "#888" }}>
                        {r.level === "varsity" ? "Varsity" : r.level === "junior_varsity" ? "JV" : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > PREVIEW_ROWS && (
              <div style={{ fontSize: 11, color: "#444", marginTop: 6 }}>
                Showing first {PREVIEW_ROWS} of {rows.length}
              </div>
            )}
          </Card>
          {error && (
            <div style={{ marginBottom: 10, padding: 10, background: "#2a0000", color: "#e06050", fontSize: 12, borderRadius: 8 }}>
              {error}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn onClick={handleImport} disabled={importing} color="#2E7D52">
              {importing ? "Importing…" : "Import"}
            </Btn>
            <Btn onClick={() => { setStep("upload"); setParsed(null); setRawCsv(""); }} color="#333" text="#aaa">
              Back
            </Btn>
          </div>
        </>
      )}

      {result && (
        <div style={{ marginTop: 14, padding: 12, background: "#091509", border: "1px solid #2E7D5233", borderRadius: 8, color: "#6BCF7F", fontSize: 13 }}>
          Imported {result.imported}, updated {result.updated}.
          {result.errors?.length > 0 && ` ${result.errors.length} error(s).`}
        </div>
      )}
    </div>
  );
}
