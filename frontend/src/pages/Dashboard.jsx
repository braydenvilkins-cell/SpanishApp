import React, { useEffect, useState } from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { getDashboard } from "../lib/api";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

export default function Dashboard({ session }) {
  const [data, setData] = useState(null);
  const sid = session?.session_id;

  useEffect(() => {
    if (sid) getDashboard(sid).then(setData).catch(() => {});
  }, [sid]);

  if (!data) {
    return <div className="p-12 font-mono text-sm text-zinc-500">loading dashboard...</div>;
  }

  const radarData = Object.entries(data.proficiency).map(([k, v]) => ({
    dim: k.slice(0, 4).toUpperCase(),
    score: v,
  }));

  const overall = Math.round(
    Object.values(data.proficiency).reduce((a, b) => a + b, 0) / 6
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
      <section className="lg:col-span-5 p-12 border-r border-zinc-200">
        <div className="overline text-zinc-500 mb-2">CURRENT LEVEL</div>
        <div className="font-display text-8xl font-black tracking-tighter leading-none" data-testid="dashboard-level">
          {data.level}
        </div>
        <div className="font-mono text-sm text-zinc-500 mt-2">
          aggregate score · {overall}/99
        </div>

        <div className="mt-10 flex gap-1">
          {LEVELS.map((l) => (
            <div
              key={l}
              data-testid={`level-block-${l}`}
              className={`flex-1 h-12 flex items-center justify-center font-display font-black tracking-tighter text-lg border ${
                l === data.level
                  ? "bg-black text-white border-black"
                  : LEVELS.indexOf(l) < LEVELS.indexOf(data.level)
                  ? "bg-zinc-200 text-zinc-700 border-zinc-300"
                  : "bg-white text-zinc-400 border-zinc-200"
              }`}
            >
              {l}
            </div>
          ))}
        </div>

        <div className="mt-10 border border-zinc-200 p-4">
          <div className="overline text-zinc-500 mb-2">BASE-44 STATE</div>
          <div className="font-mono text-xs break-all" data-testid="b44-state">
            <div>level: <span style={{ color: "var(--klein)" }}>{data.level_b44}</span></div>
            <div>prof:  <span style={{ color: "var(--klein)" }}>{data.proficiency_b44}</span></div>
          </div>
        </div>
      </section>

      <section className="lg:col-span-7 p-12">
        <div className="overline text-zinc-500 mb-2">CEFR DIMENSIONS</div>
        <div className="font-display text-2xl font-bold mb-6">
          Six axes that define your Spanish.
        </div>
        <div className="border border-zinc-200 p-4" style={{ height: 380 }} data-testid="cefr-radar">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e4e4e7" />
              <PolarAngleAxis dataKey="dim" tick={{ fontSize: 11, fontFamily: "IBM Plex Mono" }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} stroke="#e4e4e7" />
              <Radar
                name="score"
                dataKey="score"
                stroke="#002FA7"
                strokeWidth={2}
                fill="#002FA7"
                fillOpacity={0.15}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-px bg-zinc-200">
          {Object.entries(data.proficiency).map(([k, v]) => (
            <div key={k} className="bg-white p-3">
              <div className="overline text-zinc-500">{k}</div>
              <div className="font-display text-2xl font-black tracking-tighter">{v}</div>
            </div>
          ))}
        </div>

        <div className="mt-10 grid grid-cols-3 gap-px bg-zinc-200">
          <Stat label="Turns" value={data.turn} testid="stat-turns" />
          <Stat label="Vocab" value={data.vocab_count} testid="stat-vocab" />
          <Stat label="Errors" value={data.correction_count} testid="stat-errors" />
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, testid }) {
  return (
    <div className="bg-white p-4" data-testid={testid}>
      <div className="overline text-zinc-500">{label}</div>
      <div className="font-display text-3xl font-black tracking-tighter">{value}</div>
    </div>
  );
}
