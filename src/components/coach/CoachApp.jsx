import { useState, useEffect, useRef } from "react";
import { PHASES, LIFT_TEMPLATES, SPEED_TEMPLATES } from "../../lib/constants.js";
import { todayStr, fmtDate, calcLoad, makeRosterKey, makeSessionKey } from "../../lib/helpers.js";
import { isApiAvailable, getCoachDashboard, patchCoachSettings, getProgram } from "../../storage-api-client.js";
import { Card, Label } from "../ui/index.js";
import SessionRow from "./SessionRow.jsx";
import AthleteDetail from "./AthleteDetail.jsx";
import GroupSessionEntry from "./GroupSessionEntry.jsx";
import RosterImport from "./RosterImport.jsx";
import ProgramEditor from "./ProgramEditor.jsx";

export default function CoachApp({ identity, onReset }) {
  const [view, setView] = useState("dashboard");
  const [roster, setRoster] = useState({});
  const [allSessions, setAllSessions] = useState({});
  const [selectedAthlete, setSelectedAthlete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [filterDate, setFilterDate] = useState(todayStr());
  const [filterPhase, setFilterPhase] = useState(0);
  const [refreshError, setRefreshError] = useState(null);
  const [todayAttendanceFromApi, setTodayAttendanceFromApi] = useState(null);
  const [showLevelToAthletes, setShowLevelToAthletes] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [program, setProgram] = useState(null);
  const filterInitialized = useRef(false);
  const phases = program?.phases && Array.isArray(program.phases) ? program.phases : PHASES;

  const refresh = async () => {
    setLoading(true);
    setRefreshError(null);
    try {
      if (isApiAvailable()) {
        const payload = await getCoachDashboard(identity.teamCode, filterDate || undefined, filterPhase || undefined);
        setRoster(payload.roster || {});
        setAllSessions(payload.allSessions || {});
        setTodayAttendanceFromApi(payload.todayAttendance || []);
        setShowLevelToAthletes(payload.showLevelToAthletes === true);
        setLastRefresh(new Date().toLocaleTimeString());
        return;
      }
      setTodayAttendanceFromApi(null);

      const rRes = await window.storage.get(makeRosterKey(identity.teamCode), true);
      const rosterData = rRes ? JSON.parse(rRes.value) : {};
      setRoster(rosterData);

      const sessionMap = {};
      for (const athleteId of Object.keys(rosterData)) {
        const idxKey = `tc:${identity.teamCode}:idx:${athleteId}`;
        let ids = [];
        try {
          const idxRes = await window.storage.get(idxKey, true);
          if (idxRes) ids = JSON.parse(idxRes.value);
        } catch (_) {}

        const sessions = [];
        for (const sid of ids.slice(0, 30)) {
          try {
            const sKey = makeSessionKey(identity.teamCode, athleteId, sid);
            const sRes = await window.storage.get(sKey, true);
            if (sRes) sessions.push(JSON.parse(sRes.value));
          } catch (_) {}
        }
        sessionMap[athleteId] = sessions.sort((a, b) => b.date.localeCompare(a.date));
      }
      setAllSessions(sessionMap);
      const settingsKey = `tc:${identity.teamCode}:settings`;
      try {
        const sRes = await window.storage.get(settingsKey, true);
        const settings = sRes?.value ? JSON.parse(sRes.value) : {};
        setShowLevelToAthletes(settings.showLevelToAthletes === true);
      } catch (_) {
        setShowLevelToAthletes(false);
      }
      setLastRefresh(new Date().toLocaleTimeString());
    } catch (_) {
      setRefreshError("Could not load roster. Try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  useEffect(() => {
    if (!isApiAvailable()) return;
    getProgram(identity.teamCode)
      .then((data) => setProgram(data))
      .catch(() => {});
  }, [identity.teamCode]);

  useEffect(() => {
    if (!isApiAvailable()) return;
    if (!filterInitialized.current) {
      filterInitialized.current = true;
      return;
    }
    refresh();
  }, [filterDate, filterPhase]);

  const today = todayStr();
  const todayAttendance = todayAttendanceFromApi !== null
    ? todayAttendanceFromApi
    : Object.keys(roster).filter(id =>
        (allSessions[id] || []).some(s => s.date === today)
      );

  const allFlat = Object.values(allSessions).flat().sort((a, b) => b.date.localeCompare(a.date));
  const filtered = allFlat.filter(s =>
    (!filterDate || s.date === filterDate) &&
    (!filterPhase || s.phase === filterPhase)
  );

  if (view === "athlete" && selectedAthlete) {
    return <AthleteDetail
      athlete={roster[selectedAthlete]}
      athleteId={selectedAthlete}
      sessions={allSessions[selectedAthlete] || []}
      teamCode={identity.teamCode}
      onBack={() => { setView("dashboard"); setSelectedAthlete(null); }}
    />;
  }

  if (view === "groupSession") {
    return (
      <GroupSessionEntry
        roster={roster}
        teamCode={identity.teamCode}
        program={program}
        onBack={() => setView("dashboard")}
        onRefreshNeeded={refresh}
      />
    );
  }

  if (view === "program") {
    return (
      <ProgramEditor
        program={program || { phases: PHASES, liftTemplates: LIFT_TEMPLATES, speedTemplates: SPEED_TEMPLATES }}
        teamCode={identity.teamCode}
        onSave={async () => {
          const data = await getProgram(identity.teamCode);
          setProgram(data);
          setView("dashboard");
        }}
        onBack={() => setView("dashboard")}
      />
    );
  }

  if (view === "importRoster") {
    return (
      <div style={{ background: "#0a0a0a", minHeight: "100vh", fontFamily: "Georgia, serif", color: "#f0f0f0" }}>
        <div style={{ background: "#1a0000", borderBottom: "2px solid #922B21", padding: "12px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => setView("dashboard")} style={{ background: "none", border: "none", color: "#e06050", cursor: "pointer", fontSize: 18 }} aria-label="Back">←</button>
            <span style={{ color: "#e06050", fontWeight: "bold", fontSize: 15 }}>Import Roster</span>
          </div>
        </div>
        <RosterImport teamCode={identity.teamCode} onClose={() => setView("dashboard")} onSuccess={refresh} />
      </div>
    );
  }

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", fontFamily: "Georgia, serif", color: "#f0f0f0", maxWidth: 520, margin: "0 auto", paddingBottom: 60 }}>
      <div style={{ background: "#1a0000", borderBottom: "2px solid #922B21", padding: "12px 16px", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ color: "#e06050", fontWeight: "bold", fontSize: 15, letterSpacing: 1 }}>📋 COACH VIEW</div>
            <div style={{ color: "#555", fontSize: 11 }}>{identity.name} · {identity.teamCode}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {lastRefresh && <div style={{ fontSize: 10, color: "#444" }}>Updated {lastRefresh}</div>}
            <button onClick={refresh} disabled={loading} style={{
              padding: "6px 12px", background: loading ? "#1a1a1a" : "#1a0000",
              border: "1px solid #922B21", borderRadius: 6, color: loading ? "#444" : "#e06050",
              fontFamily: "inherit", fontSize: 11, cursor: loading ? "default" : "pointer",
            }}>{loading ? "..." : "↻ Refresh"}</button>
          </div>
        </div>
        {refreshError && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 12px", background: "#2a0000", borderBottom: "1px solid #922B2133", color: "#e06050", fontSize: 12 }}>
            <span>{refreshError}</span>
            <button onClick={() => setRefreshError(null)} style={{ background: "none", border: "none", color: "#e06050", cursor: "pointer", padding: "2px 6px", fontSize: 14 }} aria-label="Dismiss">×</button>
          </div>
        )}
      </div>

      <div style={{ padding: "14px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
          <Card style={{ padding: "12px 10px", textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "#555", marginBottom: 4 }}>ROSTER</div>
            <div style={{ fontSize: 26, fontWeight: "bold", color: "#e06050" }}>{Object.keys(roster).length}</div>
            <div style={{ fontSize: 10, color: "#444" }}>athletes</div>
          </Card>
          <Card style={{ padding: "12px 10px", textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "#555", marginBottom: 4 }}>TODAY</div>
            <div style={{ fontSize: 26, fontWeight: "bold", color: "#6BCF7F" }}>{todayAttendance.length}</div>
            <div style={{ fontSize: 10, color: "#444" }}>logged in</div>
          </Card>
          <Card style={{ padding: "12px 10px", textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "#555", marginBottom: 4 }}>TOTAL</div>
            <div style={{ fontSize: 26, fontWeight: "bold", color: "#C8A43A" }}>{allFlat.length}</div>
            <div style={{ fontSize: 10, color: "#444" }}>sessions</div>
          </Card>
        </div>

        <button
          onClick={() => setView("groupSession")}
          style={{
            width: "100%",
            padding: "14px",
            background: "#1a0000",
            border: "1px solid #922B21",
            borderRadius: 8,
            color: "#e06050",
            fontFamily: "inherit",
            fontSize: 14,
            cursor: "pointer",
            fontWeight: "bold",
            marginBottom: 10,
          }}
        >
          + Start Group Session
        </button>

        <button
          onClick={() => setView("program")}
          style={{
            width: "100%",
            padding: "12px",
            background: "#111",
            border: "1px solid #333",
            borderRadius: 8,
            color: "#aaa",
            fontFamily: "inherit",
            fontSize: 13,
            cursor: "pointer",
            marginBottom: 14,
          }}
        >
          Edit program
        </button>

        <Card style={{ padding: "12px 14px", marginBottom: 14, border: "1px solid #2E7D5233" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
            <Label>TODAY'S ATTENDANCE — {fmtDate(today)}</Label>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ fontSize: 11, color: "#6BCF7F", fontWeight: "bold" }}>
                {todayAttendance.length} / {Object.keys(roster).length}
              </div>
              <button
                onClick={() => setView("importRoster")}
                style={{ padding: "6px 12px", background: "#1a0000", border: "1px solid #922B21", borderRadius: 6, color: "#e06050", fontFamily: "inherit", fontSize: 11, cursor: "pointer" }}
              >
                Import roster
              </button>
            </div>
          </div>
          {Object.keys(roster).length === 0 && (
            <div style={{ color: "#444", fontSize: 13 }}>No athletes on roster yet. Share your team code: <strong style={{ color: "#C8A43A" }}>{identity.teamCode}</strong></div>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {Object.entries(roster).map(([id, ath]) => {
              const logged = todayAttendance.includes(id);
              const todaySessions = (allSessions[id] || []).filter(s => s.date === today);
              const types = [...new Set(todaySessions.map(s => s.type === "lift" ? "🏋️" : "⚡"))].join(" ");
              return (
                <button key={id} onClick={() => { setSelectedAthlete(id); setView("athlete"); }} style={{
                  padding: "7px 12px", borderRadius: 7, cursor: "pointer", fontFamily: "inherit",
                  background: logged ? "#091509" : "#1a1a1a",
                  border: `1px solid ${logged ? "#2E7D52" : "#222"}`,
                  color: logged ? "#6BCF7F" : "#555", fontSize: 12,
                  display: "flex", alignItems: "center", gap: 5,
                }}>
                  <span>{logged ? "✓" : "○"}</span>
                  <span>{ath.name}</span>
                  {types && <span style={{ fontSize: 10 }}>{types}</span>}
                </button>
              );
            })}
          </div>
        </Card>

        <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} style={{
            padding: "7px 10px", background: "#1a1a1a", border: "1px solid #2a2a2a",
            borderRadius: 6, color: "#aaa", fontFamily: "inherit", fontSize: 12,
          }} />
          <select value={filterPhase} onChange={e => setFilterPhase(Number(e.target.value))} style={{
            padding: "7px 10px", background: "#1a1a1a", border: "1px solid #2a2a2a",
            borderRadius: 6, color: "#aaa", fontFamily: "inherit", fontSize: 12,
          }}>
            <option value={0}>All Phases</option>
            {phases.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          <button onClick={() => { setFilterDate(""); setFilterPhase(0); }} style={{
            padding: "7px 10px", background: "none", border: "1px solid #2a2a2a",
            borderRadius: 6, color: "#555", fontFamily: "inherit", fontSize: 11, cursor: "pointer",
          }}>Clear</button>
          <div style={{ fontSize: 11, color: "#444", marginLeft: "auto" }}>{filtered.length} sessions</div>
        </div>

        <Label>SESSION FEED</Label>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#444" }}>No sessions match the filter.</div>
        )}
        {filtered.map((s, i) => (
          <SessionRow key={i} session={s} onClickAthlete={() => { setSelectedAthlete(s.athleteId); setView("athlete"); }} />
        ))}

        <div style={{ marginTop: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
            <Label style={{ marginBottom: 0 }}>FULL ROSTER</Label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, color: "#888" }}>
              <input
                type="checkbox"
                checked={showLevelToAthletes}
                disabled={settingsSaving}
                onChange={async (e) => {
                  const val = e.target.checked;
                  setSettingsSaving(true);
                  try {
                    if (isApiAvailable()) {
                      await patchCoachSettings(identity.teamCode, { showLevelToAthletes: val });
                      setShowLevelToAthletes(val);
                    } else {
                      const settingsKey = `tc:${identity.teamCode}:settings`;
                      let settings = {};
                      try {
                        const r = await window.storage.get(settingsKey, true);
                        if (r?.value) settings = JSON.parse(r.value);
                      } catch (_) {}
                      settings.showLevelToAthletes = val;
                      await window.storage.set(settingsKey, JSON.stringify(settings), true);
                      setShowLevelToAthletes(val);
                    }
                  } catch (_) {}
                  setSettingsSaving(false);
                }}
                style={{ width: 18, height: 18 }}
              />
              Show Varsity/JV to players
            </label>
          </div>
          {Object.entries(roster).map(([id, ath]) => {
            const athSessions = allSessions[id] || [];
            const lastSess = athSessions[0];
            const totalLoad = athSessions.filter(s => s.rpe && s.duration).reduce((a, s) => a + calcLoad(s.rpe, s.duration), 0);
            return (
              <div key={id} onClick={() => { setSelectedAthlete(id); setView("athlete"); }} style={{
                background: "#111", border: "1px solid #1e1e1e", borderRadius: 10,
                padding: "12px 14px", marginBottom: 8, cursor: "pointer",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "#333"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "#1e1e1e"}
              >
                <div>
                  <div style={{ fontWeight: "bold", color: "#e0e0e0", fontSize: 14 }}>{ath.name}</div>
                  <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{[ath.position, ath.grade, ath.level === "varsity" ? "Varsity" : ath.level === "junior_varsity" ? "JV" : null].filter(Boolean).join(" · ")} · {athSessions.length} sessions</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  {lastSess && <div style={{ fontSize: 11, color: "#666" }}>Last: {fmtDate(lastSess.date)}</div>}
                  {totalLoad > 0 && <div style={{ fontSize: 13, color: "#C8A43A", fontWeight: "bold" }}>{totalLoad.toLocaleString()} load</div>}
                </div>
              </div>
            );
          })}
        </div>

        <button onClick={onReset} style={{ width: "100%", marginTop: 16, padding: "10px", background: "none", border: "1px solid #1e1e1e", borderRadius: 8, color: "#444", fontFamily: "inherit", fontSize: 12, cursor: "pointer" }}>
          Sign out of coach view
        </button>
      </div>
    </div>
  );
}
