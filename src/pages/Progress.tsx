import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { ActivityLog, DailyPlan, Profile } from "../lib/types";

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="text-3xl font-bold text-brand-700">{value}</div>
      <div className="mt-1 text-sm font-medium text-slate-600">{label}</div>
      {sub && <div className="text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

export default function Progress({ profile }: { profile: Profile | null }) {
  const [plans, setPlans] = useState<DailyPlan[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [learned, setLearned] = useState(0);
  const [totalUnits, setTotalUnits] = useState(0);
  const [resetting, setResetting] = useState(false);

  async function resetProgress() {
    if (
      !window.confirm(
        "Zerar TODO o progresso (planos, revisões, marcações, histórico e streak)? Materiais, assuntos e marcações de capa são mantidos."
      )
    )
      return;
    setResetting(true);
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user!.id;
    await supabase.from("activity_logs").delete().eq("user_id", uid);
    await supabase.from("reviews").delete().eq("user_id", uid);
    await supabase
      .from("unit_status")
      .delete()
      .eq("user_id", uid)
      .neq("status", "skipped"); // capas/ignoradas são preservadas
    await supabase.from("daily_plans").delete().eq("user_id", uid);
    await supabase
      .from("profiles")
      .update({ streak_current: 0, streak_best: 0 })
      .eq("id", uid);
    setResetting(false);
    window.location.href = "/";
  }

  useEffect(() => {
    (async () => {
      const [p, l, s, u] = await Promise.all([
        supabase.from("daily_plans").select("*").order("date", { ascending: false }).limit(120),
        supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(60),
        supabase.from("unit_status").select("unit_id").eq("status", "learned"),
        supabase.from("units").select("id"),
      ]);
      setPlans((p.data ?? []) as DailyPlan[]);
      setLogs((l.data ?? []) as ActivityLog[]);
      setLearned(s.data?.length ?? 0);
      setTotalUnits(u.data?.length ?? 0);
    })();
  }, []);

  const daysDone = plans.filter((p) => p.status === "done").length;
  const speakingCount = logs.filter((l) => l.activity_type === "daily_speaking").length;
  const spokenMinutes = Math.round(
    logs.reduce((acc, l) => acc + (l.duration_seconds ?? 0), 0) / 60
  );
  const pct = totalUnits ? Math.round((learned / totalUnits) * 100) : 0;

  // heatmap simples das últimas 10 semanas
  const doneDates = new Set(plans.filter((p) => p.status === "done").map((p) => p.date));
  const cells: { date: string; done: boolean }[] = [];
  for (let i = 69; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    cells.push({ date: key, done: doneDates.has(key) });
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Progresso</h1>
      <p className="mt-1 text-sm text-slate-500">Sua evolução, dia após dia.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Dias estudados" value={daysDone} />
        <StatCard
          label="Streak atual"
          value={profile?.streak_current ?? 0}
          sub={`recorde: ${profile?.streak_best ?? 0}`}
        />
        <StatCard label="Trilha concluída" value={`${pct}%`} sub={`${learned}/${totalUnits} unidades`} />
        <StatCard label="Práticas de fala" value={speakingCount} sub={`${spokenMinutes} min gravados`} />
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="font-semibold">Últimas 10 semanas</h2>
        <div className="mt-4 grid grid-flow-col grid-rows-7 gap-1.5">
          {cells.map((c) => (
            <div
              key={c.date}
              title={c.date}
              className={`h-4 w-4 rounded ${
                c.done ? "bg-brand-500" : "bg-slate-100"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-red-100 bg-red-50/50 p-6">
        <h2 className="font-semibold text-red-700">Zona de teste</h2>
        <p className="mt-1 text-sm text-slate-500">
          Zera planos diários, revisões, marcações e histórico. Materiais
          importados, assuntos e marcações de capa são mantidos.
        </p>
        <button
          onClick={resetProgress}
          disabled={resetting}
          className="mt-3 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          {resetting ? "Zerando…" : "Zerar todo o progresso"}
        </button>
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="font-semibold">Histórico de prática oral</h2>
        {logs.length === 0 && (
          <p className="mt-3 text-sm text-slate-400">
            Suas gravações aparecerão aqui.
          </p>
        )}
        <div className="mt-3 space-y-3">
          {logs.slice(0, 15).map((l) => (
            <AudioRow key={l.id} log={l} />
          ))}
        </div>
      </div>
    </div>
  );
}

function AudioRow({ log }: { log: ActivityLog }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!log.audio_path) return;
    supabase.storage
      .from("recordings")
      .createSignedUrl(log.audio_path, 3600)
      .then(({ data }) => setUrl(data?.signedUrl ?? null));
  }, [log.audio_path]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 px-4 py-3">
      <div>
        <div className="text-sm font-medium">
          {new Date(log.created_at).toLocaleDateString("pt-BR")}
          {log.self_rating ? ` · autoavaliação ${log.self_rating}/5` : ""}
        </div>
        <div className="line-clamp-1 max-w-md text-xs text-slate-400">
          {log.prompt}
        </div>
      </div>
      {url ? (
        <audio controls src={url} className="h-9" />
      ) : log.audio_path ? (
        <span className="text-xs text-slate-400">carregando…</span>
      ) : (
        <span className="text-xs text-slate-300">sem áudio</span>
      )}
    </div>
  );
}
