import React, { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "../components/ui/sheet";
import { Switch } from "../components/ui/switch";
import { getBase44 } from "../lib/api";

export default function Base44Inspector({ sessionId }) {
  const [enabled, setEnabled] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (enabled && sessionId) {
      getBase44(sessionId).then(setData).catch(() => {});
    }
  }, [enabled, sessionId]);

  return (
    <Sheet>
      <div className="flex items-center gap-3 border border-zinc-200 px-3 py-2">
        <span className="overline">DEV MODE</span>
        <Switch
          data-testid="dev-mode-switch"
          checked={enabled}
          onCheckedChange={setEnabled}
        />
        {enabled && (
          <SheetTrigger asChild>
            <button
              data-testid="open-b44-inspector-btn"
              className="ml-auto font-mono text-xs underline"
            >
              INSPECT b44
            </button>
          </SheetTrigger>
        )}
      </div>
      <SheetContent
        side="right"
        className="rounded-none border-l-2 border-black w-[480px] max-w-full p-0"
        style={{ background: "#0a0a0a", color: "#00ff88" }}
        data-testid="b44-inspector-panel"
      >
        <SheetHeader className="border-b border-zinc-800 px-4 py-3">
          <SheetTitle className="font-mono text-sm text-white">
            $ nivel --base44 --inspect
          </SheetTitle>
        </SheetHeader>
        <div className="p-4 font-mono text-xs space-y-4 overflow-y-auto" style={{ height: "calc(100vh - 64px)" }}>
          {!data && <div>loading...</div>}
          {data && (
            <>
              <section>
                <div className="text-white mb-1">ALPHABET (44):</div>
                <div className="text-emerald-400 break-all">{data.alphabet}</div>
              </section>
              <section>
                <div className="text-white mb-1">GRAMMAR_TAGS:</div>
                {Object.entries(data.grammar_tags).map(([k, v]) => (
                  <div key={k} className="text-emerald-400">  {k}  =&gt; {v}</div>
                ))}
              </section>
              <section>
                <div className="text-white mb-1">LEVEL_B44 / PROFICIENCY_B44:</div>
                <div className="text-emerald-400">  level: {data.level_b44}</div>
                <div className="text-emerald-400">  prof:  {data.proficiency_b44}</div>
              </section>
              <section>
                <div className="text-white mb-1">RECENT STATES (turn|lvl|prof|topic):</div>
                {(data.recent_states_b44 || []).map((s, i) => (
                  <div key={i} className="text-emerald-400">  {String(i).padStart(2, "0")}: {s}</div>
                ))}
              </section>
              <section>
                <div className="text-white mb-1">VOCAB (b44):</div>
                {(data.vocab_b44 || []).map((v, i) => (
                  <div key={i} className="text-emerald-400">  {v.lemma.padEnd(14)} {v.b44}</div>
                ))}
                {(!data.vocab_b44 || data.vocab_b44.length === 0) && (
                  <div className="text-zinc-500">  (vacío)</div>
                )}
              </section>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
