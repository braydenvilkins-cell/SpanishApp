import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { translateWord } from "../lib/api";

function Word({ word, context }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const clean = word.replace(/[.,!?;:¡¿"()]/g, "");
  return (
    <Popover
      onOpenChange={async (open) => {
        if (open && !data && clean) {
          setLoading(true);
          try {
            const d = await translateWord(clean, context);
            setData(d);
          } catch {
            setData({ translation: "—" });
          } finally {
            setLoading(false);
          }
        }
      }}
    >
      <PopoverTrigger asChild>
        <span
          data-testid={`word-${clean}`}
          className="cursor-pointer hover:bg-black hover:text-white px-0.5 transition-colors"
        >
          {word}
        </span>
      </PopoverTrigger>
      <PopoverContent className="rounded-none border-black p-3 w-64 font-mono text-sm">
        {loading && <div>traduciendo...</div>}
        {data && (
          <div>
            <div className="overline mb-1">{data.part_of_speech || "—"} · {data.cefr}</div>
            <div className="font-display text-lg font-bold">{data.translation}</div>
            {data.example && (
              <div className="text-xs mt-2 text-zinc-500 italic">{data.example}</div>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default function Transcript({ history, show }) {
  if (!show) return null;
  return (
    <div
      data-testid="transcript-panel"
      className="border border-zinc-200 bg-white overflow-y-auto"
      style={{ maxHeight: "70vh" }}
    >
      <div className="sticky top-0 bg-black text-white px-4 py-2 overline">
        TRANSCRIPCIÓN · TAP CUALQUIER PALABRA
      </div>
      <div className="p-6 space-y-6">
        {history.length === 0 && (
          <div className="text-zinc-400 font-mono text-sm">Aún no hay turnos.</div>
        )}
        {history.map((h, i) => (
          <div key={i} className="space-y-3">
            <div>
              <div className="overline text-zinc-400">TÚ · {h.pronunciation_score ?? "—"}/99</div>
              <div className="text-base text-zinc-700">{h.user}</div>
            </div>
            <div>
              <div className="overline" style={{ color: "var(--klein)" }}>NIVEL</div>
              <div className="text-xl leading-relaxed">
                {h.assistant.split(/(\s+)/).map((tok, j) =>
                  /\s+/.test(tok) ? tok : <Word key={j} word={tok} context={h.assistant} />
                )}
              </div>
              {h.english && (
                <div className="text-sm text-zinc-400 mt-1">{h.english}</div>
              )}
            </div>
            {h.corrections?.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {h.corrections.map((c, k) => (
                  <span
                    key={k}
                    data-testid={`correction-chip-${i}-${k}`}
                    className="inline-flex items-center gap-2 border border-black px-2 py-1 font-mono text-xs"
                  >
                    <span style={{ color: "var(--red)", textDecoration: "line-through" }}>
                      {c.wrong}
                    </span>
                    <span style={{ color: "var(--green)" }}>→ {c.correct}</span>
                    <span className="overline text-zinc-500">{c.tag}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
