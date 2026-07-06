import { supabase } from "./supabase";
import { todayStr } from "./srs";
import type { DailyPlan, Material, PlanItem, Review, Unit, UnitStatus } from "./types";

/** Templates da atividade final de fala. Rotaciona por dia do ano. */
const SPEAKING_TEMPLATES = [
  "Fale por 1 minuto sobre o tema de hoje usando pelo menos 3 frases da página de frases e 2 phrasal verbs do bloco de hoje. Grave o áudio.",
  "Responda em voz alta, em inglês: What did you do yesterday? What are you going to do tomorrow? Use o conteúdo de hoje na resposta. Grave o áudio.",
  "Simule uma conversa: você encontra um amigo e conta uma novidade relacionada ao tema de hoje. Fale as duas partes do diálogo. Grave o áudio.",
  "Escolha 3 frases simples que você diria em português sobre o tema e fale as versões em inglês, melhorando cada uma com um conector (well, actually, so, by the way). Grave o áudio.",
  "Releia a página de pronúncia de hoje e grave 5 frases do dia caprichando nesse som específico. Depois ouça e compare.",
  "Conecte 3 ideias sobre o tema de hoje em uma fala única usando first, then, so e actually. Fale por 45 segundos sem parar. Grave o áudio.",
];

export function speakingPromptForToday(): string {
  const day = Math.floor(Date.now() / 86400000);
  return SPEAKING_TEMPLATES[day % SPEAKING_TEMPLATES.length];
}

interface PlannerData {
  materials: Material[];
  units: Unit[];
  statuses: UnitStatus[];
  reviews: Review[];
}

async function loadPlannerData(userId: string): Promise<PlannerData> {
  const [m, u, s, r] = await Promise.all([
    supabase.from("materials").select("*"),
    supabase.from("units").select("*").order("position", { ascending: true }),
    supabase.from("unit_status").select("*"),
    supabase.from("reviews").select("*"),
  ]);
  return {
    materials: (m.data ?? []) as Material[],
    units: (u.data ?? []) as Unit[],
    statuses: (s.data ?? []) as UnitStatus[],
    reviews: (r.data ?? []) as Review[],
  };
}

function nextPendingUnit(
  units: Unit[],
  materials: Material[],
  statuses: UnitStatus[],
  materialType: string
): Unit | null {
  const matIds = new Set(
    materials.filter((m) => m.type === materialType).map((m) => m.id)
  );
  const done = new Set(
    statuses.filter((s) => s.status === "learned").map((s) => s.unit_id)
  );
  const candidates = units
    .filter((u) => matIds.has(u.material_id) && !done.has(u.id))
    .sort(
      (a, b) =>
        (a.position ?? 0) - (b.position ?? 0) || a.page_start - b.page_start
    );
  return candidates[0] ?? null;
}

/** Busca o plano de hoje; se não existir, gera e salva. */
export async function getOrCreateTodayPlan(userId: string): Promise<DailyPlan | null> {
  const today = todayStr();

  const existing = await supabase
    .from("daily_plans")
    .select("*")
    .eq("date", today)
    .maybeSingle();
  if (existing.data) return existing.data as DailyPlan;

  const { materials, units, statuses, reviews } = await loadPlannerData(userId);
  if (units.length === 0) return null; // materiais ainda não importados

  const items: PlanItem[] = [];

  const main = nextPendingUnit(units, materials, statuses, "mindmap");
  if (main) items.push({ unit_id: main.id, role: "main", done: false });

  const phrases = nextPendingUnit(units, materials, statuses, "phrases");
  if (phrases) items.push({ unit_id: phrases.id, role: "phrases", done: false });

  const pv = nextPendingUnit(units, materials, statuses, "phrasal_verbs");
  if (pv) items.push({ unit_id: pv.id, role: "phrasal_verbs", done: false });

  const pron = nextPendingUnit(units, materials, statuses, "pronunciation");
  if (pron) items.push({ unit_id: pron.id, role: "pronunciation", done: false });

  // Revisões vencidas (máx. 5): travei na fala primeiro, depois mais atrasadas
  const today10 = todayStr();
  const due = reviews
    .filter((r) => r.due_date && r.due_date <= today10)
    .sort((a, b) => {
      if (a.stuck_speaking !== b.stuck_speaking) return a.stuck_speaking ? -1 : 1;
      return (a.due_date ?? "").localeCompare(b.due_date ?? "") || a.ease - b.ease;
    })
    .slice(0, 5);
  for (const r of due) {
    items.push({ unit_id: r.unit_id, role: "review", done: false });
  }

  const theme = main?.title || main?.category || "Estudo do dia";

  const insert = await supabase
    .from("daily_plans")
    .insert({ user_id: userId, date: today, theme, status: "pending", items })
    .select()
    .single();

  return (insert.data as DailyPlan) ?? null;
}

export async function updatePlan(plan: DailyPlan): Promise<void> {
  await supabase
    .from("daily_plans")
    .update({ items: plan.items, status: plan.status, theme: plan.theme })
    .eq("id", plan.id);
}
