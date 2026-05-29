import React from "react";
import { motion } from "framer-motion";

/**
 * Massive press-and-hold voice orb.
 * states: idle | recording | thinking | speaking
 */
export default function VoiceOrb({ state, onStart, onStop }) {
  const isRec = state === "recording";
  const isThinking = state === "thinking";
  const isSpeaking = state === "speaking";

  const handleDown = (e) => {
    e.preventDefault();
    if (state === "idle") onStart?.();
  };
  const handleUp = (e) => {
    e.preventDefault();
    if (isRec) onStop?.();
  };

  const color =
    isRec ? "#FF2A00" : isSpeaking ? "#00C853" : isThinking ? "#0a0a0a" : "#002FA7";

  const label =
    isRec ? "ESCUCHANDO..." :
    isThinking ? "PENSANDO..." :
    isSpeaking ? "HABLANDO" : "MANTÉN PARA HABLAR";

  return (
    <div className="relative flex flex-col items-center select-none">
      {(isRec || isSpeaking) && (
        <>
          <span
            className="absolute rounded-full ring-pulse"
            style={{
              width: 220, height: 220, top: 0, left: "50%",
              transform: "translate(-50%, 0)",
              border: `2px solid ${color}`,
              animationDelay: "0s",
            }}
          />
          <span
            className="absolute rounded-full ring-pulse"
            style={{
              width: 220, height: 220, top: 0, left: "50%",
              transform: "translate(-50%, 0)",
              border: `2px solid ${color}`,
              animationDelay: "0.6s",
            }}
          />
        </>
      )}

      <motion.button
        data-testid="voice-orb-btn"
        onMouseDown={handleDown}
        onMouseUp={handleUp}
        onMouseLeave={isRec ? handleUp : undefined}
        onTouchStart={handleDown}
        onTouchEnd={handleUp}
        disabled={isThinking}
        animate={{
          scale: isRec ? 1.05 : isSpeaking ? [1, 1.03, 1] : 1,
        }}
        transition={{
          duration: isSpeaking ? 0.8 : 0.2,
          repeat: isSpeaking ? Infinity : 0,
        }}
        className="relative z-10 rounded-full flex items-center justify-center tactile"
        style={{
          width: 220, height: 220,
          backgroundColor: color,
          color: "white",
          border: "none",
          cursor: isThinking ? "wait" : "pointer",
          boxShadow: "0 0 0 8px white inset",
        }}
      >
        <span className="font-display font-black text-2xl tracking-tighter">
          {isThinking ? "..." : isRec ? "•••" : "ES"}
        </span>
      </motion.button>

      <div
        data-testid="voice-orb-label"
        className="overline mt-8 font-mono"
        style={{ color: "var(--text-muted)" }}
      >
        {label}
      </div>
    </div>
  );
}
