import React, { useEffect, useRef, useState } from "react";
import VoiceOrb from "../components/VoiceOrb";
import Transcript from "../components/Transcript";
import Base44Inspector from "../components/Base44Inspector";
import { Switch } from "../components/ui/switch";
import { initSession, voiceTurn, textTurn } from "../lib/api";
import { getSessionId, setSessionId } from "../lib/session";
import { toast } from "sonner";

export default function Talk({ session, refreshSession }) {
  const [orbState, setOrbState] = useState("idle");
  const [showTranscript, setShowTranscript] = useState(true);
  const [history, setHistory] = useState([]);
  const [text, setText] = useState("");
  const [lastGrade, setLastGrade] = useState(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const audioRef = useRef(null);

  const sid = session?.session_id;

  const playAudio = (b64) => {
    if (!b64) return;
    const a = new Audio(`data:audio/mp3;base64,${b64}`);
    audioRef.current = a;
    setOrbState("speaking");
    a.onended = () => setOrbState("idle");
    a.onerror = () => setOrbState("idle");
    a.play().catch(() => setOrbState("idle"));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size < 1000) {
          setOrbState("idle");
          return;
        }
        setOrbState("thinking");
        try {
          const res = await voiceTurn(sid, blob, true);
          appendTurn({ user: res.user_text, ...res });
          playAudio(res.audio_b64);
        } catch (e) {
          toast.error("Error de transcripción");
          setOrbState("idle");
        }
      };
      recorderRef.current = rec;
      rec.start();
      setOrbState("recording");
    } catch (e) {
      toast.error("Necesito permiso de micrófono");
    }
  };

  const stopRecording = () => {
    const rec = recorderRef.current;
    if (rec && rec.state === "recording") rec.stop();
  };

  const appendTurn = (turn) => {
    setHistory((h) => [...h, turn]);
    setLastGrade(turn.cefr_grade);
    refreshSession?.();
  };

  const submitText = async () => {
    if (!text.trim()) return;
    setOrbState("thinking");
    const userText = text;
    setText("");
    try {
      const res = await textTurn(sid, userText, true);
      appendTurn({ user: userText, ...res });
      playAudio(res.audio_b64);
    } catch (e) {
      toast.error("Error de servidor");
      setOrbState("idle");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 border-t border-zinc-200">
      {/* Left: orb area */}
      <section className="lg:col-span-7 p-12 flex flex-col items-center justify-center min-h-[70vh] border-r border-zinc-200">
        <div className="w-full max-w-md mb-12">
          <div className="overline text-zinc-500 mb-2">TEMA ACTUAL</div>
          <div className="font-display text-3xl font-bold leading-tight" data-testid="current-topic">
            {session?.topic || "Presentación inicial"}
          </div>
          <div className="overline mt-2" style={{ color: "var(--klein)" }}>
            OBJETIVO: {session?.target || "saludos básicos"}
          </div>
        </div>

        <VoiceOrb state={orbState} onStart={startRecording} onStop={stopRecording} />

        <div className="mt-12 w-full max-w-md flex gap-2">
          <input
            data-testid="text-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitText()}
            placeholder="...o escribe tu turno en español"
            className="flex-1 border border-zinc-300 px-3 py-2 font-mono text-sm focus:outline-none focus:border-black"
          />
          <button
            data-testid="send-text-btn"
            onClick={submitText}
            className="invert-hover px-4 py-2 overline tactile"
          >
            ENVIAR
          </button>
        </div>

        {lastGrade && (
          <div className="mt-8 grid grid-cols-3 gap-px bg-zinc-200 w-full max-w-md" data-testid="last-grade">
            {Object.entries(lastGrade).map(([k, v]) => (
              <div key={k} className="bg-white p-2 text-center">
                <div className="overline text-zinc-500">{k.slice(0, 4)}</div>
                <div className="font-mono text-lg">{v}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Right: transcript + controls */}
      <aside className="lg:col-span-5 p-6 space-y-4">
        <div className="flex items-center gap-3 border border-zinc-200 px-3 py-2">
          <span className="overline">TRANSCRIPT</span>
          <Switch
            data-testid="transcript-toggle-btn"
            checked={showTranscript}
            onCheckedChange={setShowTranscript}
            className="ml-auto"
          />
        </div>

        <Base44Inspector sessionId={sid} />

        <Transcript history={history} show={showTranscript} />
      </aside>
    </div>
  );
}
