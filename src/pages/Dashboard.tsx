import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Flame,
  Mic,
  RefreshCw,
  Zap,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { getOrCreateTodayPlan } from "../lib/planner";
import { todayStr } from "../lib/srs";
import type { DailyPlan, Profile } from "../lib/types";

export default function Dashboard({
  profile,
}: {
  profile: Profile | null;
  setProfile: (p: Profile) => void;
}) {
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [noContent, setNoContent] = useState(false);
  const [dueCount, setDueCount] = useState(0);
  const [stuck, setStuck] = useState<{ category: string; n: number }[]>([]);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const p = await getOrCreateTodayPlan(userData.user.id);
      if (!p) setNoContent(true);
      setPlan(p);

      const { data: due } = await supabase
        .from("reviews")
        .select("id")
        .lte("due_date", todayStr());
      setDueCount(due?.length ?? 0);

      // ranking simples de temas travados
      const { data: st } = await supabase
        .from("unit_status")
        .select("unit_id, status, units(category, kind)")
        .eq("status", "stuck_speaking");
      const counts = new Map<string, number>();
      (st ?? []).forEach((row: any) => {
        const cat = row.units?.category || row.units?.kind || "geral";
        counts.set(cat, (counts.get(cat) ?? 0) + 1);
      });
      setStuck(
        [...counts.entries()]
          .map(([category, n]) => ({ category, n }))
          .sort((a, b) => b.n - a.n)
          .slice(0, 3)
      );
    })();
  }, []);

  const doneItems = plan?.items.filter((i) => i.done).length ?? 0;
  const totalItems = plan?.items.length ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Olá, {profile?.name ?? "estudante"} 👋
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Constância vale mais que volume. Bora falar inglês hoje?
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-orange-50 px-4 py-2">
          <Flame className="h-5 w-5 text-orange-500" />
          <span className="font-bold text-orange-600">
            {profile?.streak_current ?? 0}
          </span>
          <span className="text-sm text-orange-400">dias</span>
        </div>
      </div>

      {noContent ? (
        <Link
          to="/importar"
          className="mt-8 flex items-center justify-between rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50 p-8 hover:border-brand-400"
        >
          <div>
            <h2 className="text-lg font-semibold text-brand-700">
              Comece importando seus materiais
            </h2>
            <p className="mt-1 text-sm text-brand-600/70">
              Envie os 6 PDFs uma única vez e o sistema monta sua trilha diária.
            </p>
          </div>
          <ArrowRight className="h-6 w-6 text-brand-500" />
        </Link>
      ) : (
        <Link
          to="/estudo"
          className="mt-8 block rounded-2xl bg-gradient-to-r from-brand-600 to-brand-500 p-8 text-white shadow-lg transition hover:shadow-xl"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm/none uppercase tracking-wide text-brand-100">
                Plano de hoje
              </div>
              <h2 className="mt-2 text-2xl font-bold">
                {plan?.theme ?? "Carregando…"}
              </h2>
              <p className="mt-2 text-sm text-brand-100">
                {plan?.status === "done"
                  ? "Concluído! 🎉 Volte amanhã — ou faça uma prática extra."
                  : `${doneItems}/${totalItems} etapas · ~${profile?.daily_minutes ?? 20} min · termina com prática de fala`}
              </p>
            </div>
            <BookOpen className="h-12 w-12 text-white/60" />
          </div>
        </Link>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link
          to="/estudo"
          className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-brand-300 hover:shadow"
        >
          <Zap className="h-5 w-5 text-amber-500" />
          <div className="mt-2 font-semibold">Prática rápida agora</div>
          <p className="mt-1 text-xs text-slate-400">
            Abre o próximo passo pendente do dia
          </p>
        </Link>
        <Link
          to="/revisao"
          className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-brand-300 hover:shadow"
        >
          <RefreshCw className="h-5 w-5 text-emerald-500" />
          <div className="mt-2 font-semibold">
            Revisar o que estou esquecendo
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {dueCount} unidade{dueCount === 1 ? "" : "s"} vencida
            {dueCount === 1 ? "" : "s"} para revisar
          </p>
        </Link>
        <Link
          to="/estudo"
          className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-brand-300 hover:shadow"
        >
          <Mic className="h-5 w-5 text-red-500" />
          <div className="mt-2 font-semibold">Treinar fala de hoje</div>
          <p className="mt-1 text-xs text-slate-400">
            Vá direto para a atividade oral do dia
          </p>
        </Link>
      </div>

      {stuck.length > 0 && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-center gap-2 font-semibold text-amber-700">
            <AlertTriangle className="h-4 w-4" /> Onde você mais trava
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {stuck.map((s) => (
              <span
                key={s.category}
                className="rounded-full bg-white px-3 py-1 text-sm text-amber-700"
              >
                {s.category} · {s.n}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
