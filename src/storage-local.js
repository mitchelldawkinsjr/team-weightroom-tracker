/**
 * Local storage adapter: uses localStorage in the browser (persists across reload),
 * or in-memory Maps when localStorage is not available.
 * API: get(key, shared?), set(key, value, shared?), delete(key)
 * All methods are async. Values are stored as strings; the app uses JSON.stringify/parse.
 */
const PREFIX = "twt_";
const SHARED_PREFIX = "twt_shared_";

function getStore(sharedFlag) {
  if (typeof localStorage !== "undefined") return sharedFlag ? "shared" : "local";
  if (!getStore.mem) getStore.mem = { memLocal: new Map(), memShared: new Map() };
  return sharedFlag ? getStore.mem.memShared : getStore.mem.memLocal;
}

function localKey(key) { return PREFIX + key; }
function sharedKey(key) { return SHARED_PREFIX + key; }

export const storage = {
  async get(key, sharedFlag) {
    const store = getStore(sharedFlag);
    if (store === "local") {
      try {
        const value = localStorage.getItem(localKey(key));
        return value != null ? { value } : null;
      } catch (_) { return null; }
    }
    if (store === "shared") {
      try {
        const value = localStorage.getItem(sharedKey(key));
        return value != null ? { value } : null;
      } catch (_) { return null; }
    }
    const value = store.get(key);
    return value != null ? { value } : null;
  },
  async set(key, value, sharedFlag) {
    const store = getStore(sharedFlag);
    if (store === "local") {
      try { localStorage.setItem(localKey(key), value); } catch (_) {}
      return;
    }
    if (store === "shared") {
      try { localStorage.setItem(sharedKey(key), value); } catch (_) {}
      return;
    }
    store.set(key, value);
  },
  async delete(key) {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem(localKey(key));
        localStorage.removeItem(sharedKey(key));
      }
    } catch (_) {}
    const mem = getStore.mem;
    if (mem) {
      mem.memLocal.delete(key);
      mem.memShared.delete(key);
    }
  },
};

export function storageReset() {
  if (typeof localStorage !== "undefined") {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith(PREFIX) || k.startsWith(SHARED_PREFIX))) keys.push(k);
    }
    keys.forEach(k => localStorage.removeItem(k));
  }
  const mem = getStore.mem;
  if (mem) {
    mem.memLocal.clear();
    mem.memShared.clear();
  }
}
