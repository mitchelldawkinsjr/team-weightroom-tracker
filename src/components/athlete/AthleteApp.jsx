import { useState, useEffect } from "react";
import { todayStr, buildExercises, makeSessionKey } from "../../lib/helpers.js";
import { getCheckInRecommendations } from "../../lib/checkIn.js";
import { isApiAvailable, getAthleteSessions, createSession, getRosterForTeam, getProgram } from "../../storage-api-client.js";
import { PHASES } from "../../lib/constants.js";
import SessionStarter from "./SessionStarter.jsx";
import SessionLogger from "./SessionLogger.jsx";
import SessionHistory from "./SessionHistory.jsx";

export default function AthleteApp({ identity, onReset }) {
  const [tab, setTab] = useState("start");
  const [activeSession, setActiveSession] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [histOpen, setHistOpen] = useState(null);
  const [pendingStart, setPendingStart] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const [showLevelToAthletes, setShowLevelToAthletes] = useState(false);
  const [program, setProgram] = useState(null);

  const ACTIVE_SESSION_KEY = "twt_active_session";
  const phases = program?.phases && Array.isArray(program.phases) ? program.phases : PHASES;

  useEffect(() => {
    async function load() {
      try {
        if (isApiAvailable()) {
          const list = await getAthleteSessions(identity.athleteId, identity.teamCode);
          setSessions(Array.isArray(list) ? list : []);
        } else {
          const r = await window.storage.get(`local_sessions_${identity.athleteId}`);
          if (r) setSessions(JSON.parse(r.value));
        }
        try {
          const saved = localStorage.getItem(ACTIVE_SESSION_KEY);
          if (saved) {
            const draft = JSON.parse(saved);
            if (draft && draft.athleteId === identity.athleteId && !draft.complete) {
              setActiveSession(draft);
              setTab("log");
            }
          }
        } catch (_) {}
      } catch (_) {}
    }
    load();
  }, [identity.athleteId, identity.teamCode]);

  useEffect(() => {
    if (!activeSession) {
      try {
        localStorage.removeItem(ACTIVE_SESSION_KEY);
      } catch (_) {}
      return;
    }
    const t = setTimeout(() => {
      try {
        localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(activeSession));
      } catch (_) {}
    }, 500);
    return () => clearTimeout(t);
  }, [activeSession]);

  useEffect(() => {
    async function loadProgram() {
      if (!isApiAvailable()) return;
      try {
        const data = await getProgram(identity.teamCode);
        setProgram(data);
      } catch (_) {
        setProgram(null);
      }
    }
    loadProgram();
  }, [identity.teamCode]);

  useEffect(() => {
    async function loadSettings() {
      try {
        if (isApiAvailable()) {
          const res = await getRosterForTeam(identity.teamCode);
          setShowLevelToAthletes(res.showLevelToAthletes === true);
        } else {
          const settingsKey = `tc:${identity.teamCode}:settings`;
          const r = await window.storage.get(settingsKey, true);
          const settings = r?.value ? JSON.parse(r.value) : {};
          setShowLevelToAthletes(settings.showLevelToAthletes === true);
        }
      } catch (_) {
        setShowLevelToAthletes(false);
      }
    }
    loadSettings();
  }, [identity.teamCode]);

  const saveSessions = (list) => {
    setSessions(list);
    if (!isApiAvailable()) {
      window.storage.set(`local_sessions_${identity.athleteId}`, JSON.stringify(list)).catch(() => {});
    }
  };

  const startSessionWithCheckIn = (phase, type, checkIn, checkInRecommendations) => {
    setActiveSession({
      id: `${identity.athleteId}_${Date.now()}`,
      athleteId: identity.athleteId,
      athleteName: identity.name,
      position: identity.position,
      grade: identity.grade,
      teamCode: identity.teamCode,
      phase,
      type,
      date: todayStr(),
      exercises: buildExercises(phase, type),
      rpe: "",
      duration: "",
      notes: "",
      startedAt: new Date().toISOString(),
      complete: false,
      checkIn,
      checkInRecommendations,
    });
    setPendingStart(null);
    setTab("log");
  };

  const handleCheckInSubmit = (checkIn) => {
    const recentWithMotivation = sessions
      .filter(s => s.checkIn?.motivation != null)
      .slice(0, 3);
    const checkInRecommendations = getCheckInRecommendations(checkIn, recentWithMotivation);
    startSessionWithCheckIn(pendingStart.phase, pendingStart.type, checkIn, checkInRecommendations);
  };

  const updateSet = (ei, si, field, val) => {
    setActiveSession(prev => {
      const ex = [...prev.exercises];
      const sets = [...ex[ei].sets_data];
      sets[si] = { ...sets[si], [field]: val };
      ex[ei] = { ...ex[ei], sets_data: sets };
      return { ...prev, exercises: ex };
    });
  };

  const toggleDone = (ei, si) => {
    setActiveSession(prev => {
      const ex = [...prev.exercises];
      const sets = [...ex[ei].sets_data];
      sets[si] = { ...sets[si], done: !sets[si].done };
      ex[ei] = { ...ex[ei], sets_data: sets };
      return { ...prev, exercises: ex };
    });
  };

  const addSet = (ei) => {
    setActiveSession(prev => {
      const ex = [...prev.exercises];
      ex[ei] = { ...ex[ei], sets_data: [...ex[ei].sets_data, { weight: "", reps: "", done: false }] };
      return { ...prev, exercises: ex };
    });
  };

  const finishSession = async () => {
    const final = { ...activeSession, complete: true, completedAt: new Date().toISOString() };
    const updated = [final, ...sessions];
    setSessions(updated);

    setSyncing(true);
    setSyncError(null);
    try {
      if (isApiAvailable()) {
        await createSession(final);
        setActiveSession(null);
        setTab("start");
        return;
      }

      const key = makeSessionKey(identity.teamCode, identity.athleteId, final.id);
      await window.storage.set(key, JSON.stringify(final), true);

      const idxKey = `tc:${identity.teamCode}:idx:${identity.athleteId}`;
      let idx = [];
      try { const r = await window.storage.get(idxKey, true); if (r) idx = JSON.parse(r.value); } catch (_) {}
      idx = [final.id, ...idx.filter(x => x !== final.id)].slice(0, 50);
      await window.storage.set(idxKey, JSON.stringify(idx), true);

      setActiveSession(null);
      setTab("start");
    } catch (_) {
      setSyncError("Session saved locally but could not sync to team. Try again later.");
    } finally {
      setSyncing(false);
    }
  };

  const doneSets = activeSession ? activeSession.exercises.reduce((a, e) => a + e.sets_data.filter(s => s.done).length, 0) : 0;
  const totalSets = activeSession ? activeSession.exercises.reduce((a, e) => a + e.sets_data.length, 0) : 0;
  const pct = totalSets > 0 ? Math.round((doneSets / totalSets) * 100) : 0;

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", fontFamily: "Georgia, serif", color: "#f0f0f0", maxWidth: 480, margin: "0 auto", paddingBottom: 80 }}>
      <div style={{ background: "#0D1F3C", borderBottom: "2px solid #C8A43A", padding: "12px 16px", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ color: "#C8A43A", fontWeight: "bold", fontSize: 15, letterSpacing: 1 }}>{identity.name}</div>
            <div style={{ color: "#555", fontSize: 11 }}>
              {[identity.position, identity.grade, showLevelToAthletes && (identity.level === "varsity" ? "Varsity" : identity.level === "junior_varsity" ? "JV" : null), identity.teamCode].filter(Boolean).join(" · ")}
            </div>
          </div>
          {activeSession && (
            <div style={{ textAlign: "right" }}>
              <div style={{ color: "#C8A43A", fontWeight: "bold" }}>{pct}%</div>
              <div style={{ fontSize: 11, color: "#444" }}>{doneSets}/{totalSets}</div>
            </div>
          )}
        </div>
        {activeSession && (
          <div style={{ height: 3, background: "#1a1a1a", borderRadius: 2, marginTop: 8 }}>
            <div style={{ height: "100%", width: `${pct}%`, background: "#C8A43A", borderRadius: 2, transition: "width 0.3s" }} />
          </div>
        )}
      </div>

      <div style={{ display: "flex", background: "#111", borderBottom: "1px solid #1e1e1e", position: "sticky", top: 52, zIndex: 49 }}>
        {[["start", "Start"], ["log", "Log", !activeSession], ["history", "History"]].map(([id, label, disabled]) => (
          <button key={id} onClick={() => !disabled && setTab(id)} style={{
            flex: 1, padding: "11px 4px", background: "none", border: "none",
            borderBottom: tab === id ? "2px solid #C8A43A" : "2px solid transparent",
            color: disabled ? "#333" : tab === id ? "#C8A43A" : "#666",
            fontSize: 12, fontFamily: "inherit", cursor: disabled ? "default" : "pointer",
            letterSpacing: 1, textTransform: "uppercase",
          }}>{label}</button>
        ))}
      </div>

      <div style={{ padding: "16px 14px" }}>
        {tab === "start" && (
          <SessionStarter
            phases={phases}
            activeSession={activeSession}
            pct={pct}
            pendingStart={pendingStart}
            onPendingStart={setPendingStart}
            onCheckInSubmit={handleCheckInSubmit}
            onOpenLog={() => setTab("log")}
            onReset={onReset}
          />
        )}
        {tab === "log" && activeSession && (
          <SessionLogger
            activeSession={activeSession}
            identity={identity}
            updateSet={updateSet}
            toggleDone={toggleDone}
            addSet={addSet}
            setActiveSession={setActiveSession}
            onFinish={finishSession}
            onDiscard={() => {
              setActiveSession(null);
              setTab("start");
              setSyncError(null);
            }}
            syncing={syncing}
            syncError={syncError}
            setSyncError={setSyncError}
            pct={pct}
          />
        )}
        {tab === "history" && (
          <SessionHistory sessions={sessions} histOpen={histOpen} setHistOpen={setHistOpen} />
        )}
      </div>
    </div>
  );
}
