import axios from "axios";

const BASE = process.env.REACT_APP_BACKEND_URL;
export const API = `${BASE}/api`;

export const http = axios.create({ baseURL: API, timeout: 120000 });

export async function initSession(session_id) {
  const { data } = await http.post("/session/init", { session_id });
  return data;
}

export async function getDaily(session_id) {
  const { data } = await http.get(`/daily`, { params: { session_id } });
  return data;
}

export async function startDaily(session_id) {
  const { data } = await http.post(`/daily/start`, { session_id });
  return data;
}

export async function textTurn(session_id, text, speak = true, assistance_factor = 1.0) {
  const { data } = await http.post(`/turn/text`, { session_id, text, speak, assistance_factor });
  return data;
}

export async function voiceTurn(session_id, blob, speak = true, assistance_factor = 1.0) {
  const fd = new FormData();
  fd.append("session_id", session_id);
  fd.append("speak", String(speak));
  fd.append("assistance_factor", String(assistance_factor));
  fd.append("audio", blob, "utt.webm");
  const { data } = await http.post(`/turn/voice`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function translateWord(word, context = "") {
  const { data } = await http.post(`/translate`, { word, context });
  return data;
}

export async function getDashboard(sid) {
  const { data } = await http.get(`/dashboard/${sid}`);
  return data;
}

export async function getReview(sid) {
  const { data } = await http.get(`/review/${sid}`);
  return data;
}

export async function getBase44(sid) {
  const { data } = await http.get(`/base44/inspect/${sid}`);
  return data;
}
