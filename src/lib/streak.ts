import { supabase } from "./supabase";
import { todayStr } from "./srs";
import type { Profile } from "./types";

/** Atualiza streak quando o plano do dia é concluído. */
export async function bumpStreak(profile: Profile): Promise<Profile> {
  const today = todayStr();

  // já concluiu um plano ontem?
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const y10 = yesterday.toISOString().slice(0, 10);

  const { data: yPlan } = await supabase
    .from("daily_plans")
    .select("id,status")
    .eq("date", y10)
    .eq("status", "done")
    .maybeSingle();

  const current = yPlan ? profile.streak_current + 1 : 1;
  const best = Math.max(current, profile.streak_best);

  const updated = { ...profile, streak_current: current, streak_best: best };
  await supabase
    .from("profiles")
    .update({ streak_current: current, streak_best: best })
    .eq("id", profile.id);
  return updated;
}
