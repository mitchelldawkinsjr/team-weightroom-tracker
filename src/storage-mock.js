// Wire the local storage adapter to window.storage (used by the app and E2E).
// When VITE_API_BASE is set, profile, sessions, and coach dashboard use the API (see storage-api-client.js);
// window.storage is still used for identity_v2 and login codes.
import { storage, storageReset } from "./storage-local.js";

window.storage = storage;
window.__storageReset = storageReset;
