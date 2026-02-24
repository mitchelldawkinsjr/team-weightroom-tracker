import { useState, useEffect } from "react";
import Landing from "./components/Landing.jsx";
import Setup from "./components/Setup.jsx";
import RedeemCode from "./components/RedeemCode.jsx";
import AthleteApp from "./components/athlete/AthleteApp.jsx";
import CoachApp from "./components/coach/CoachApp.jsx";
import { isApiAvailable, getToken, clearToken } from "./storage-api-client.js";

function decodeJwtPayload(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

function Splash({ text }) {
  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#C8A43A", fontFamily: "Georgia, serif", fontSize: 16 }}>{text}</div>
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState(null);
  const [identity, setIdentity] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        if (isApiAvailable()) {
          const token = getToken();
          if (token) {
            const payload = decodeJwtPayload(token);
            if (payload && payload.teamCode && payload.athleteId != null) {
              const id = {
                teamCode: payload.teamCode,
                athleteId: payload.athleteId,
                isCoach: !!payload.isCoach,
                name: payload.name || "",
                position: payload.position ?? "",
                grade: payload.grade ?? "",
              };
              setIdentity(id);
              setMode(id.isCoach ? "coach" : "athlete");
              setLoaded(true);
              return;
            }
          }
        }
        const saved = await window.storage.get("identity_v2");
        if (saved) {
          const id = JSON.parse(saved.value);
          setIdentity(id);
          setMode(id.isCoach ? "coach" : "athlete");
        }
      } catch (_) {}
      setLoaded(true);
    }
    load();
  }, []);

  const saveIdentity = (id) => {
    const toStore = { ...id };
    if (toStore.token) delete toStore.token;
    setIdentity(toStore);
    window.storage.set("identity_v2", JSON.stringify(toStore)).catch(() => {});
    setMode(toStore.isCoach ? "coach" : "athlete");
  };

  const resetIdentity = () => {
    setIdentity(null);
    setMode("setup");
    clearToken();
    window.storage.delete("identity_v2").catch(() => {});
  };

  if (!loaded) return <Splash text="Loading..." />;
  if (!mode) return <Landing onSelect={setMode} />;
  if (mode === "setup") return <Setup onSave={saveIdentity} onBack={() => setMode(null)} />;
  if (mode === "redeem_code") return <RedeemCode onSuccess={saveIdentity} onBack={() => setMode(null)} />;
  if (mode === "athlete" && identity) return <AthleteApp identity={identity} onReset={resetIdentity} />;
  if (mode === "coach" && identity) return <CoachApp identity={identity} onReset={resetIdentity} />;
  return <Landing onSelect={setMode} />;
}
