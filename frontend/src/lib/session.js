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
