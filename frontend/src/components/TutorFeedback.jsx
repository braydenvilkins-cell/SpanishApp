import React from "react";

/**
 * Silent, written tutor coaching panel. English only.
 * Renders the latest turn's grade, corrections, vocab, and tutor tip.
 * This NEVER speaks - it's pure on-screen coaching so audio is uninterrupted.
 */
export default function TutorFeedback({ turn, level, assistance = 1, transcriptViews = 0, speed = 1 }) {
  if (!turn) {
    return (
      <div
        data-testid="tutor-feedback-empty"
        className="border border-zinc-200 bg-white p-6"
      >
        <div className="overline mb-3" style={{ color: "var(--klein)" }}>
          TUTOR · LIVE COACHING
        </div>
        <p className="text-sm text-zinc-500">
          Your written tutor will appear here after your first turn. They watch
          every utterance, grade it silently, and tell you what to try next —
          without interrupting your conversation.
        </p>
      </div>
    );
  }

  const grade = turn.cefr_grade || {};
  const corrections = turn.corrections || [];
  const vocab = turn.vocab_injected || {};
  const dims = ["grammar", "lexicon", "fluency", "pronunciation", "comprehension", "complexity"];
  const assistPct = Math.round(assistance * 100);
  const assistColor = assistance >= 0.9 ? "var(--green)" : assistance >= 0.7 ? "var(--klein)" : "var(--red)";

  return (
    <div
      data-testid="tutor-feedback-panel"
      className="border-2 border-black bg-white"
    >
      <div className="bg-black text-white px-4 py-2 flex items-center justify-between">
        <span className="overline">TUTOR · LIVE COACHING</span>
        <span className="font-mono text-xs">turn {turn.turn} · {level}</span>
      </div>

      <div className="p-5 space-y-5">
        {/* Assistance / improvement-credit indicator */}
        <div
          className="flex items-center justify-between border border-zinc-200 px-3 py-2"
          data-testid="assistance-indicator"
        >
          <div className="flex flex-col">
            <span className="overline text-zinc-500">IMPROVEMENT CREDIT</span>
            <span className="font-mono text-xs text-zinc-500">
              speed {speed.toFixed(2)}× · peeks {transcriptViews}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-24 h-2 bg-zinc-200 relative">
              <div
                className="absolute top-0 left-0 h-full"
                style={{ width: `${assistPct}%`, background: assistColor }}
              />
            </div>
            <span
              className="font-display text-xl font-black tracking-tighter"
              style={{ color: assistColor }}
              data-testid="assistance-pct"
            >
              {assistPct}%
            </span>
          </div>
        </div>

        {turn.tutor_tip && (
          <div data-testid="tutor-tip">
            <div className="overline text-zinc-500 mb-1">COACH NOTE</div>
            <p className="text-base leading-snug">{turn.tutor_tip}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-px bg-zinc-200">
          <div className="bg-white p-3">
            <div className="overline text-zinc-500 mb-1">WHAT WORKED</div>
            <div
              className="text-sm font-medium"
              style={{ color: "var(--green)" }}
              data-testid="tutor-strength"
            >
              {turn.strength || "—"}
            </div>
          </div>
          <div className="bg-white p-3">
            <div className="overline text-zinc-500 mb-1">TRY NEXT</div>
            <div
              className="text-sm font-medium"
              style={{ color: "var(--klein)" }}
              data-testid="tutor-next-target"
            >
              {turn.next_target || "—"}
            </div>
          </div>
        </div>

        <div>
          <div className="overline text-zinc-500 mb-2">CEFR GRADE · THIS TURN</div>
          <div className="grid grid-cols-3 gap-px bg-zinc-200">
            {dims.map((d) => {
              const short = d === "comprehension" ? "comp" : d === "complexity" ? "cplx" : d.slice(0, 4);
              return (
                <div key={d} className="bg-white p-2 text-center">
                  <div className="overline text-zinc-500">{short}</div>
                  <div className="font-display text-lg font-black tracking-tighter">
                    {grade[d] ?? "—"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {corrections.length > 0 && (
          <div data-testid="tutor-corrections">
            <div className="overline text-zinc-500 mb-2">CORRECTION</div>
            {corrections.map((c, i) => (
              <div key={i} className="border border-zinc-200 p-3 mb-2 last:mb-0">
                <div className="font-mono text-sm">
                  <span style={{ color: "var(--red)", textDecoration: "line-through" }}>
                    {c.wrong}
                  </span>
                  {" → "}
                  <span style={{ color: "var(--green)" }}>{c.correct}</span>
                </div>
                <div className="overline mt-1 text-zinc-500">{c.tag}</div>
                {c.explanation && (
                  <p className="text-sm text-zinc-700 mt-2">{c.explanation}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {vocab && vocab.lemma && (
          <div data-testid="tutor-vocab">
            <div className="overline text-zinc-500 mb-2">VOCAB INJECTED</div>
            <div className="border border-zinc-200 p-3">
              <div className="flex items-baseline justify-between mb-1">
                <span className="font-display text-xl font-bold">{vocab.lemma}</span>
                <span className="overline text-zinc-500">
                  {vocab.tag} · {vocab.cefr}
                </span>
              </div>
              <div className="text-sm text-zinc-600 italic">
                {vocab.translation}
              </div>
            </div>
          </div>
        )}

        {turn.pronunciation_score != null && (
          <div className="flex items-center gap-3">
            <div className="overline text-zinc-500">PRONUNCIATION</div>
            <div className="flex-1 h-2 bg-zinc-200 relative">
              <div
                className="absolute top-0 left-0 h-full"
                style={{
                  width: `${turn.pronunciation_score}%`,
                  background: "var(--klein)",
                }}
              />
            </div>
            <div
              className="font-mono text-xs w-10 text-right"
              data-testid="pronunciation-score"
            >
              {turn.pronunciation_score}/99
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
