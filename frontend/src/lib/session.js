/**
 * Local-only session pointer.
 *
 * SECURITY NOTE: The value stored here is a non-sensitive UUID v4 that the
 * backend uses to look up an anonymous Nivel learner session. It is NOT an
 * auth token, NOT a JWT, and contains no PII. Anyone in possession of the
 * UUID can read/append to that anonymous session only — same threat model
 * as a public share link. If/when auth is added, the auth token must NOT
 * be placed here; use httpOnly cookies for that.
 */
const KEY = "nivel.session_id";

export function getSessionId() {
  let id = localStorage.getItem(KEY);
  return id;
}

export function setSessionId(id) {
  localStorage.setItem(KEY, id);
}

export function clearSession() {
  localStorage.removeItem(KEY);
}
