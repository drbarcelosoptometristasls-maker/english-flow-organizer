import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import type { Profile } from "./lib/types";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Study from "./pages/Study";
import Trail from "./pages/Trail";
import Library from "./pages/Library";
import Review from "./pages/Review";
import Progress from "./pages/Progress";
import Import from "./pages/Import";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setProfile(null);
      return;
    }
    (async () => {
      const uid = session.user.id;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .maybeSingle();
      if (data) {
        setProfile(data as Profile);
      } else {
        const fresh = {
          id: uid,
          name: session.user.email?.split("@")[0] ?? "Estudante",
          level: "intermediate",
          daily_minutes: 20,
          streak_current: 0,
          streak_best: 0,
        };
        await supabase.from("profiles").insert(fresh);
        setProfile(fresh as Profile);
      }
    })();
  }, [session]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400">
        Carregando…
      </div>
    );
  }

  if (!session) return <Login />;

  return (
    <Layout profile={profile}>
      <Routes>
        <Route path="/" element={<Dashboard profile={profile} setProfile={setProfile} />} />
        <Route path="/estudo" element={<Study profile={profile} setProfile={setProfile} />} />
        <Route path="/trilha" element={<Trail />} />
        <Route path="/biblioteca" element={<Library />} />
        <Route path="/revisao" element={<Review />} />
        <Route path="/progresso" element={<Progress profile={profile} />} />
        <Route path="/importar" element={<Import />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
