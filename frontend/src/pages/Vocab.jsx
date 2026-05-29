import React, { useEffect, useState } from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "../components/ui/hover-card";
import { getDashboard } from "../lib/api";

function heatClass(m) {
  if (m >= 80) return "heat-4";
  if (m >= 55) return "heat-3";
  if (m >= 30) return "heat-2";
  if (m >= 10) return "heat-1";
  return "heat-0";
}

const TAG_LABEL = {
  "@": "verb", "#": "noun", "$": "adjective", "%": "preposition",
  "&": "conjunction", "*": "idiom", "+": "subjunctive", "-": "error",
};

export default function Vocab({ session }) {
  const [data, setData] = useState(null);
  const sid = session?.session_id;

  useEffect(() => {
    if (sid) getDashboard(sid).then(setData).catch(() => {});
  }, [sid]);

  const vocab = data?.vocab || [];
  // pad with placeholders so the heatmap always feels populated
  const totalCells = Math.max(150, vocab.length + 30);
  const cells = [...vocab, ...Array(Math.max(0, totalCells - vocab.length)).fill(null)];

  return (
    <div className="p-12">
      <div className="overline text-zinc-500 mb-2">VOCABULARY</div>
      <h1 className="font-display text-5xl font-black tracking-tighter leading-none mb-2">
        Lexical heatmap.
      </h1>
      <p className="text-zinc-600 max-w-xl mb-10">
        Each cell is a word you have seen or produced. Color goes from grey
        (just encountered) to Swiss green (mastered).
      </p>

      <div className="flex items-center gap-4 mb-6 font-mono text-xs">
        <span>0</span>
        <div className="flex gap-px">
          {["heat-0", "heat-1", "heat-2", "heat-3", "heat-4"].map((c) => (
            <div key={c} className={`w-6 h-6 ${c}`} />
          ))}
        </div>
        <span>99</span>
        <span className="text-zinc-500 ml-4">mastery</span>
      </div>

      <div className="grid gap-0.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(24px, 1fr))" }} data-testid="vocab-heatmap">
        {cells.map((v, i) => {
          const m = v?.mastery ?? -1;
          const cls = v ? heatClass(m) : "heat-0 opacity-40";
          if (!v) return <div key={i} className={`w-6 h-6 ${cls}`} />;
          return (
            <HoverCard key={i} openDelay={50}>
              <HoverCardTrigger asChild>
                <div
                  data-testid={`vocab-cell-${v.lemma}`}
                  className={`w-6 h-6 ${cls} cursor-pointer hover:outline hover:outline-2 hover:outline-black`}
                />
              </HoverCardTrigger>
              <HoverCardContent className="rounded-none border-black p-3 w-64 font-mono text-xs">
                <div className="overline mb-1">
                  {TAG_LABEL[v.tag] || "?"} · {v.cefr}
                </div>
                <div className="font-display text-lg font-bold">{v.lemma}</div>
                {v.translation && (
                  <div className="text-zinc-500 italic">{v.translation}</div>
                )}
                <div className="mt-2 text-zinc-500">
                  mastery {v.mastery}/99 · seen {v.seen}
                </div>
              </HoverCardContent>
            </HoverCard>
          );
        })}
      </div>

      <div className="mt-10 border border-zinc-200">
        <div className="bg-black text-white px-4 py-2 overline">RECENT WORDS</div>
        <div className="divide-y divide-zinc-200">
          {vocab.slice(-20).reverse().map((v, i) => (
            <div key={i} className="grid grid-cols-12 px-4 py-2 font-mono text-sm">
              <div className="col-span-3 font-display text-base">{v.lemma}</div>
              <div className="col-span-2 text-zinc-500">{TAG_LABEL[v.tag]}</div>
              <div className="col-span-2 text-zinc-500">{v.cefr}</div>
              <div className="col-span-3 text-zinc-600">{v.translation}</div>
              <div className="col-span-2 text-right">m={v.mastery}/99</div>
            </div>
          ))}
          {vocab.length === 0 && (
            <div className="px-4 py-4 text-zinc-400 font-mono text-sm">
              No words yet. Start a conversation.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
