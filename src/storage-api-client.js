/**
 * API client for the backend (Postgres). Used when VITE_API_BASE is set (e.g. production).
 * Provides: createProfile, getProfile, createSession, updateSession, getAthleteSessions, getCoachDashboard.
 */

/** When served under ghfb hub at /weightroom/, prefix API calls to match nginx proxy. */
export function getAppRoot() {
  if (typeof window === "undefined") return "";
  const path = window.location.pathname || "";
  if (path === "/weightroom" || path.startsWith("/weightroom/")) return "/weightroom";
  return "";
}

export function getApiBase() {
  if (import.meta.env.PROD) return getAppRoot();
  const base = import.meta.env.VITE_API_BASE;
  return base && String(base).trim() ? String(base).trim().replace(/\/$/, "") : "";
}

export function isApiAvailable() {
  if (import.meta.env.PROD) return true;
  return !!import.meta.env.VITE_API_BASE?.trim();
}

const JWT_KEY = "jwt_token";

export function getToken() {
  try {
    return typeof localStorage !== "undefined" ? localStorage.getItem(JWT_KEY) : null;
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(JWT_KEY, token);
  } catch (_) {}
}

export function clearToken() {
  try {
    if (typeof localStorage !== "undefined") localStorage.removeItem(JWT_KEY);
  } catch (_) {}
}

async function apiFetch(path, options = {}) {
  if (!isApiAvailable()) throw new Error("API base not configured");
  const base = getApiBase();
  const url = path.startsWith("http") ? path : `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = { "Content-Type": "application/json", ...options.headers };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, {
    ...options,
    headers,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (_) {
    data = null;
  }
  if (!res.ok) {
    const err = new Error(data?.error || res.statusText || "Request failed");
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/** POST /api/profile - create or update athlete/coach profile. Returns identity shape + token. */
export async function createProfile(body) {
  const data = await apiFetch("/api/profile", { method: "POST", body: JSON.stringify(body) });
  if (data && data.token) {
    setToken(data.token);
  }
  return data;
}

/** GET /api/profile/:id?teamCode=... */
export async function getProfile(id, teamCode) {
  const params = new URLSearchParams({ teamCode });
  return apiFetch(`/api/profile/${encodeURIComponent(id)}?${params}`);
}

/** POST /api/sessions - create session. Body: full session object. */
export async function createSession(session) {
  return apiFetch("/api/sessions", { method: "POST", body: JSON.stringify(session) });
}

/** PUT /api/sessions/:id - update session (including finish). */
export async function updateSession(id, session) {
  return apiFetch(`/api/sessions/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(session) });
}

/** GET /api/athletes/:athleteId/sessions?teamCode=... */
export async function getAthleteSessions(athleteId, teamCode) {
  const params = new URLSearchParams({ teamCode });
  return apiFetch(`/api/athletes/${encodeURIComponent(athleteId)}/sessions?${params}`);
}

/** GET /api/coach/dashboard?teamCode=...&date=...&phase=... - roster, allSessions, todayAttendance. */
export async function getCoachDashboard(teamCode, date = null, phase = null) {
  const params = new URLSearchParams({ teamCode });
  if (date) params.set("date", date);
  if (phase != null && phase !== "") params.set("phase", String(phase));
  return apiFetch(`/api/coach/dashboard?${params}`);
}

/** POST /api/coach/roster/import - bulk import roster rows. Returns { imported, updated, errors }. */
export async function importRoster(teamCode, rows) {
  return apiFetch("/api/coach/roster/import", {
    method: "POST",
    body: JSON.stringify({ teamCode, rows }),
  });
}

/** PATCH /api/coach/settings - update team setting (e.g. showLevelToAthletes). */
export async function patchCoachSettings(teamCode, settings) {
  return apiFetch("/api/coach/settings", {
    method: "PATCH",
    body: JSON.stringify({ teamCode, ...settings }),
  });
}

/** GET /api/roster?teamCode=... - public roster for athlete selection. Returns { roster, showLevelToAthletes }. */
export async function getRosterForTeam(teamCode) {
  const params = new URLSearchParams({ teamCode });
  return apiFetch(`/api/roster?${params}`);
}

/** GET /api/program?teamCode=... - program (phases, liftTemplates, speedTemplates) for team. Auth required. */
export async function getProgram(teamCode) {
  const params = new URLSearchParams({ teamCode });
  return apiFetch(`/api/program?${params}`);
}

/** PUT /api/program - save program (coach only). Body: { teamCode, phases, liftTemplates, speedTemplates }. */
export async function putProgram(teamCode, payload) {
  return apiFetch("/api/program", {
    method: "PUT",
    body: JSON.stringify({ teamCode, ...payload }),
  });
}

/** POST /api/profile/claim - athlete claims identity from roster with jersey verification. Returns identity. */
export async function claimProfile(teamCode, athleteId, jerseyNumber) {
  const data = await apiFetch("/api/profile/claim", {
    method: "POST",
    body: JSON.stringify({ teamCode, athleteId, jerseyNumber: jerseyNumber ?? "" }),
  });
  if (data && data.token) {
    setToken(data.token);
  }
  return data;
}

/** POST /api/login-codes - create one-time login code (coach, auth required). Returns { code, expiresAt }. */
export async function createLoginCode(athleteId, teamCode) {
  return apiFetch("/api/login-codes", {
    method: "POST",
    body: JSON.stringify({ athleteId, teamCode }),
  });
}

/** GET /api/login-codes/:code - redeem code. Optional teamCode query. Returns identity + token. */
export async function redeemLoginCode(code, teamCode = null) {
  const params = teamCode ? new URLSearchParams({ teamCode }) : new URLSearchParams();
  const data = await apiFetch(`/api/login-codes/${encodeURIComponent(String(code).toUpperCase().trim())}${params.toString() ? `?${params}` : ""}`);
  if (data && data.token) {
    setToken(data.token);
  }
  return data;
}
