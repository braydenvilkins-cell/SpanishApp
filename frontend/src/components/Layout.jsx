import React from "react";
import { NavLink, useLocation } from "react-router-dom";

const NAV = [
  { to: "/", label: "TALK", testid: "nav-talk" },
  { to: "/daily", label: "DAILY", testid: "nav-daily" },
  { to: "/dashboard", label: "CEFR", testid: "nav-dashboard" },
  { to: "/vocab", label: "VOCAB", testid: "nav-vocab" },
  { to: "/review", label: "REVIEW", testid: "nav-review" },
];

export default function Layout({ children, level }) {
  const loc = useLocation();
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      <header className="border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="font-display text-2xl font-black tracking-tighter">
            NIVEL<span style={{ color: "var(--klein)" }}>.</span>
          </div>
          <span className="overline text-zinc-500">VOICE-FIRST · CEFR-ADAPTIVE · BASE-44</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="overline text-zinc-500">CURRENT</span>
          <span
            data-testid="header-level-badge"
            className="font-display text-xl font-black border-2 border-black px-2 py-0.5"
            style={{ background: "var(--klein)", color: "white" }}
          >
            {level || "A1"}
          </span>
        </div>
      </header>
      <nav className="border-b border-zinc-200 px-6 flex">
        {NAV.map((n) => {
          const active = n.to === "/" ? loc.pathname === "/" : loc.pathname.startsWith(n.to);
          return (
            <NavLink
              key={n.to}
              to={n.to}
              data-testid={n.testid}
              className={`px-5 py-3 overline tactile border-r border-zinc-200 ${
                active ? "bg-black text-white" : "bg-white text-black hover:bg-zinc-100"
              }`}
            >
              {n.label}
            </NavLink>
          );
        })}
      </nav>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-zinc-200 px-6 py-3 flex items-center justify-between font-mono text-xs text-zinc-500">
        <span>NIVEL // GPT-5.2 · WHISPER · TTS-1</span>
        <span>ENCODED IN BASE-44</span>
      </footer>
    </div>
  );
}
