import React, { useEffect, useState, useCallback } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import Layout from "./components/Layout";
import Talk from "./pages/Talk";
import Daily from "./pages/Daily";
import Dashboard from "./pages/Dashboard";
import Vocab from "./pages/Vocab";
import Review from "./pages/Review";
import { initSession } from "./lib/api";
import { getSessionId, setSessionId } from "./lib/session";

function App() {
  const [session, setSession] = useState(null);

  const refresh = useCallback(async (existingId) => {
    const sid = existingId || getSessionId();
    const data = await initSession(sid);
    setSessionId(data.session_id);
    setSession(data);
    return data;
  }, []);

  useEffect(() => {
    refresh().catch((e) => console.error("session init failed", e));
  }, [refresh]);

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center font-mono text-sm text-zinc-500">
        inicializando nivel...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Toaster position="bottom-right" theme="light" />
      <Layout level={session.level}>
        <Routes>
          <Route path="/" element={<Talk session={session} refreshSession={refresh} />} />
          <Route path="/daily" element={<Daily session={session} refreshSession={refresh} />} />
          <Route path="/dashboard" element={<Dashboard session={session} />} />
          <Route path="/vocab" element={<Vocab session={session} />} />
          <Route path="/review" element={<Review session={session} />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
