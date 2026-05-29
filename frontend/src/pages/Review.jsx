import React, { useEffect, useState } from "react";
import { getReview } from "../lib/api";

export default function Review({ session }) {
  const [deck, setDeck] = useState([]);
  const [idx, setIdx] = useState(0);
  const [reveal, setReveal] = useState(false);
  const sid = session?.session_id;

  useEffect(() => {
    if (sid) getReview(sid).then((d) => setDeck(d.deck || [])).catch(() => {});
  }, [sid]);

  const card = deck[idx];
  const next = () => {
    setReveal(false);
    setIdx((i) => (i + 1) % Math.max(deck.length, 1));
  };

  return (
    <div className="p-12 max-w-3xl mx-auto">
      <div className="overline text-zinc-500 mb-2">SPACED REVIEW</div>
      <h1 className="font-display text-5xl font-black tracking-tighter leading-none mb-10">
        Your mistakes. Now learned.
      </h1>

      {!card && (
        <div className="border border-zinc-200 p-12 text-center font-mono text-sm text-zinc-500" data-testid="review-empty">
          No cards to review yet. Talk to Nivel first.
        </div>
      )}

      {card && (
        <div className="border-2 border-black bg-white p-12" data-testid="review-card">
          <div className="overline text-zinc-500 mb-4">
            {card.kind === "correction" ? "CORRECTION" : "VOCABULARY"} ·{" "}
            {card.tag?.toUpperCase()} {card.cefr ? `· ${card.cefr}` : ""}
          </div>
          <div className="font-display text-5xl font-black tracking-tighter mb-8">
            {card.front}
          </div>
          {reveal ? (
            <>
              <div className="border-t border-zinc-200 pt-6">
                <div className="overline text-zinc-500 mb-2">ANSWER</div>
                <div className="font-display text-3xl font-bold" style={{ color: "var(--green)" }}>
                  {card.back}
                </div>
                {card.explanation && (
                  <div className="mt-4 text-zinc-600">{card.explanation}</div>
                )}
                {typeof card.mastery !== "undefined" && (
                  <div className="mt-4 font-mono text-xs text-zinc-500">
                    mastery {card.mastery}/99
                  </div>
                )}
              </div>
              <div className="mt-8 flex gap-3">
                <button
                  data-testid="review-next-btn"
                  onClick={next}
                  className="invert-hover px-6 py-3 overline tactile"
                >
                  NEXT →
                </button>
              </div>
            </>
          ) : (
            <button
              data-testid="review-reveal-btn"
              onClick={() => setReveal(true)}
              className="bg-black text-white px-6 py-3 overline tactile hover:bg-zinc-800"
            >
              SHOW ANSWER
            </button>
          )}
          <div className="mt-10 font-mono text-xs text-zinc-500">
            {idx + 1} / {deck.length}
          </div>
        </div>
      )}
    </div>
  );
}
