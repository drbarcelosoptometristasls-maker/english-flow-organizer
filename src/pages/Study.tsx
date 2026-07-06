import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Mic,
  PartyPopper,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { getOrCreateTodayPlan, speakingPromptForToday, updatePlan } from "../lib/planner";
import { nextReview, todayStr } from "../lib/srs";
import { bumpStreak } from "../lib/streak";
import type {
  DailyPlan,
  Material,
  PlanRole,
  Profile,
  Unit,
  UnitStatusValue,
} from "../lib/types";
import PdfPage from "../components/PdfPage";
import Recorder from "../components/Recorder";

const ROLE_LABEL: Record<PlanRole, string> = {
  main: "Tema do dia",
  phrases: "Frases do dia",
  phrasal_verbs: "Phrasal verbs",
  pronunciation: "Ponto de pronúncia",
  review: "Mini-revisão",
};

const ROLE_TIP: Record<PlanRole, string> = {
  main: "Leia o mapa mental em voz alta. Não só leia: fale os exemplos como se fossem seus.",
  phrases: "Escolha 3–5 frases desta página e fale cada uma 3 vezes, sem ler na última.",
  phrasal_verbs: "Para cada phrasal verb, crie UMA frase sua em voz alta.",
  pronunciation: "Repita os exemplos exagerando o som. Grave-se mentalmente no ritmo.",
  review: "Antes de reler: tente lembrar e FALAR o conteúdo desta página. Depois confira.",
};

export default function Study({
  profile,
  setProfile,
}: {
  profile: Profile | null;
  setProfile: (p: Profile) => void;
}) {
  const navigate = useNavigate();
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [units, setUnits] = useState<Map<string, Unit>>(new Map());
  const [materials, setMaterials] = useState<Map<string, Material>>(new Map());
  const [step, setStep] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [finished, setFinished] = useState(false);
  const [audio, setAudio] = useState<{ blob: Blob | null; secs: number }>({
    blob: null,
    secs: 0,
  });
  const [rating, setRating] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const p = await getOrCreateTodayPlan(userData.user.id);
      setPlan(p);
      if (!p) return;

      const ids = p.items.map((i) => i.unit_id);
      const { data: us } = await supabase.from("units").select("*").in("id", ids);
      const uMap = new Map<string, Unit>();
      (us ?? []).forEach((u: any) => uMap.set(u.id, u as Unit));
      setUnits(uMap);

      const { data: ms } = await supabase.from("materials").select("*");
      const mMap = new Map<string, Material>();
      (ms ?? []).forEach((m: any) => mMap.set(m.id, m as Material));
      setMaterials(mMap);

      const firstPending = p.items.findIndex((i) => !i.done);
      setStep(firstPending === -1 ? p.items.length : firstPending);
      if (p.status === "done") setFinished(true);
    })();
  }, []);

  const totalSteps = (plan?.items.length ?? 0) + 1; // +1 fala final
  const isSpeakingStep = plan ? step >= plan.items.length : false;
  const current = plan && !isSpeakingStep ? plan.items[step] : null;
  const currentUnit = current ? units.get(current.unit_id) : null;
  const currentMaterial = currentUnit
    ? materials.get(currentUnit.material_id)
    : null;

  const speakingPrompt = useMemo(() => speakingPromptForToday(), []);

  async function markStatus(status: UnitStatusValue) {
    if (!currentUnit) return;
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user!.id;
    await supabase.from("unit_status").upsert({
      user_id: uid,
      unit_id: currentUnit.id,
      status,
      updated_at: new Date().toISOString(),
    });
    // agenda/atualiza revisão
    const { data: existing } = await supabase
      .from("reviews")
      .select("*")
      .eq("unit_id", currentUnit.id)
      .maybeSingle();
    if (existing) {
      const result =
        status === "learned" ? "easy" : status === "needs_review" ? "hard" : "failed";
      const nr = nextReview(existing, result);
      await supabase
        .from("reviews")
        .update({ ...nr, stuck_speaking: status === "stuck_speaking" })
        .eq("id", existing.id);
    } else {
      const days = status === "learned" ? 3 : 1;
      const due = new Date();
      due.setDate(due.getDate() + days);
      await supabase.from("reviews").insert({
        user_id: uid,
        unit_id: currentUnit.id,
        ease: 2.5,
        interval_days: days,
        due_date: due.toISOString().slice(0, 10),
        stuck_speaking: status === "stuck_speaking",
      });
    }
    await advance();
  }

  async function advance() {
    if (!plan || !current) return;
    const items = plan.items.map((i, idx) =>
      idx === step ? { ...i, done: true } : i
    );
    const updated = { ...plan, items };
    setPlan(updated);
    await updatePlan(updated);
    setStep((s) => s + 1);
  }

  async function finishDay() {
    if (!plan) return;
    setFinishing(true);
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user!.id;

    let audioPath: string | null = null;
    if (audio.blob) {
      audioPath = `${uid}/${todayStr()}-${Date.now()}.webm`;
      await supabase.storage.from("recordings").upload(audioPath, audio.blob, {
        contentType: "audio/webm",
      });
    }

    await supabase.from("activity_logs").insert({
      user_id: uid,
      daily_plan_id: plan.id,
      unit_ids: plan.items.map((i) => i.unit_id),
      activity_type: "daily_speaking",
      prompt: speakingPrompt,
      audio_path: audioPath,
      duration_seconds: audio.secs || null,
      self_rating: rating,
    });

    const done = { ...plan, status: "done" as const };
    await updatePlan(done);
    setPlan(done);

    if (profile) {
      const p = await bumpStreak(profile);
      setProfile(p);
    }
    setFinishing(false);
    setFinished(true);
  }

  if (!plan) {
    return (
      <div className="py-20 text-center text-slate-400">
        Nenhum plano para hoje ainda — importe seus materiais primeiro.
      </div>
    );
  }

  if (finished) {
    return (
      <div className="py-16 text-center">
        <PartyPopper className="mx-auto h-14 w-14 text-brand-500" />
        <h1 className="mt-4 text-2xl font-bold">Estudo de hoje concluído!</h1>
        <p className="mt-2 text-slate-500">
          Streak: {profile?.streak_current ?? 1} dia
          {(profile?.streak_current ?? 1) === 1 ? "" : "s"} 🔥 — volte amanhã.
        </p>
        <button
          onClick={() => navigate("/")}
          className="mt-6 rounded-lg bg-brand-600 px-6 py-2.5 font-semibold text-white"
        >
          Voltar ao início
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* progresso */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-brand-700">
            {isSpeakingStep
              ? "Atividade final de fala"
              : ROLE_LABEL[current!.role]}
          </span>
          <span className="text-slate-400">
            {Math.min(step + 1, totalSteps)}/{totalSteps}
          </span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-slate-100">
          <div
            className="h-2 rounded-full bg-brand-500 transition-all"
            style={{ width: `${(Math.min(step, totalSteps) / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {!isSpeakingStep && currentUnit && currentMaterial?.file_path && (
        <div>
          <div className="mb-4 rounded-xl bg-brand-50 px-5 py-4 text-sm text-brand-700">
            💡 {ROLE_TIP[current!.role]}
          </div>

          <PdfPage
            filePath={currentMaterial.file_path}
            pageStart={currentUnit.page_start}
            pageEnd={currentUnit.page_end}
          />

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => markStatus("learned")}
              className="rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600"
            >
              ✓ Aprendi
            </button>
            <button
              onClick={() => markStatus("needs_review")}
              className="rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-600"
            >
              Preciso revisar
            </button>
            <button
              onClick={() => markStatus("stuck_speaking")}
              className="rounded-lg bg-red-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-600"
            >
              Travei na fala
            </button>
          </div>

          <div className="mt-4 flex justify-between">
            <button
              disabled={step === 0}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="flex items-center gap-1 text-sm text-slate-400 disabled:opacity-30"
            >
              <ArrowLeft className="h-4 w-4" /> Anterior
            </button>
            <button
              onClick={advance}
              className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600"
            >
              Pular <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {isSpeakingStep && (
        <div className="mx-auto max-w-2xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-8">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-red-50 p-3">
                <Mic className="h-6 w-6 text-red-500" />
              </div>
              <h2 className="text-lg font-bold">Hora de falar 🎙️</h2>
            </div>

            <p className="mt-4 rounded-xl bg-slate-50 p-5 text-slate-700">
              {speakingPrompt}
            </p>

            <div className="mt-6">
              <Recorder
                onRecorded={(blob, secs) => setAudio({ blob, secs })}
              />
            </div>

            <div className="mt-6">
              <div className="text-sm font-medium text-slate-600">
                Como foi? (autoavaliação)
              </div>
              <div className="mt-2 flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setRating(n)}
                    className={`h-10 w-10 rounded-full text-sm font-bold transition ${
                      rating === n
                        ? "bg-brand-600 text-white"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-slate-400">
                1 = travei muito · 5 = falei com naturalidade
              </p>
            </div>

            <button
              disabled={finishing || rating === null}
              onClick={finishDay}
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-40"
            >
              <CheckCircle2 className="h-5 w-5" />
              {finishing ? "Salvando…" : "Concluir estudo de hoje"}
            </button>
            {rating === null && (
              <p className="mt-2 text-center text-xs text-slate-400">
                Grave (ou pelo menos fale em voz alta) e se autoavalie para concluir.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
