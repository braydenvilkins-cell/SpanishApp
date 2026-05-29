import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDaily, startDaily } from "../lib/api";

export default function Daily({ session, refreshSession }) {
  const [data, setData] = useState(null);
  const nav = useNavigate();
  const sid = session?.session_id;

  useEffect(() => {
    if (sid) getDaily(sid).then(setData).catch(() => {});
  }, [sid]);

  const start = async () => {
    await startDaily(sid);
    await refreshSession();
    nav("/");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
      <div className="lg:col-span-7 p-12 border-r border-zinc-200">
        <div className="overline text-zinc-500 mb-4">{data?.date || "HOY"}</div>
        <h1 className="font-display text-5xl sm:text-6xl font-black tracking-tighter leading-none mb-8">
          Tu conversación<br />de hoy.
        </h1>

        <div
          data-testid="daily-card"
          className="border-2 border-black bg-black text-white p-8 max-w-xl"
          style={{
            backgroundImage:
              "url(https://images.pexels.com/photos/31757550/pexels-photo-31757550.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940)",
            backgroundSize: "cover",
            backgroundBlendMode: "multiply",
            backgroundColor: "rgba(10,10,10,0.85)",
          }}
        >
          <div className="overline mb-3">NIVEL · {data?.level || "A1"}</div>
          <div className="font-display text-3xl font-bold mb-4">
            {data?.topic || "Cargando..."}
          </div>
          <div className="font-mono text-sm mb-6 text-zinc-300">
            OBJETIVO GRAMATICAL · {data?.target || "..."}
          </div>
          <div className="font-mono text-sm mb-8">
            ~{data?.duration_min || 5} min
          </div>
          <div className="border-l-2 border-white pl-4 italic text-lg mb-8">
            "{data?.opener || ""}"
          </div>
          <button
            data-testid="start-daily-btn"
            onClick={start}
            className="bg-white text-black px-6 py-3 font-display font-black tracking-tighter text-xl tactile hover:bg-yellow-300"
          >
            COMENZAR →
          </button>
        </div>
      </div>

      <div className="lg:col-span-5 p-12 bg-zinc-50">
        <div className="overline text-zinc-500 mb-4">CÓMO FUNCIONA</div>
        <ol className="space-y-6 font-display">
          <li className="flex gap-4">
            <span className="font-black text-4xl tracking-tighter text-zinc-300">01</span>
            <span className="text-lg leading-tight pt-2">
              Mantén el orbe azul y habla en español.
            </span>
          </li>
          <li className="flex gap-4">
            <span className="font-black text-4xl tracking-tighter text-zinc-300">02</span>
            <span className="text-lg leading-tight pt-2">
              Nivel transcribe, califica y responde en voz natural.
            </span>
          </li>
          <li className="flex gap-4">
            <span className="font-black text-4xl tracking-tighter text-zinc-300">03</span>
            <span className="text-lg leading-tight pt-2">
              Cada turno ajusta tu vector CEFR en seis dimensiones.
            </span>
          </li>
          <li className="flex gap-4">
            <span className="font-black text-4xl tracking-tighter text-zinc-300">04</span>
            <span className="text-lg leading-tight pt-2">
              Inyectamos una palabra o estructura un nivel por encima del tuyo.
            </span>
          </li>
        </ol>
      </div>
    </div>
  );
}
