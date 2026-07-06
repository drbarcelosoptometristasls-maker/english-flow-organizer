export type MaterialType =
  | "mindmap"
  | "phrases"
  | "phrasal_verbs"
  | "pronunciation"
  | "exercises";

export interface Material {
  id: string;
  user_id: string;
  title: string;
  type: MaterialType;
  file_path: string | null;
  page_count: number | null;
  imported_at: string;
}

export interface Unit {
  id: string;
  user_id: string;
  material_id: string;
  page_start: number;
  page_end: number;
  title: string | null;
  kind: string | null;
  category: string | null;
  level: string | null; // beginner | intermediate | advanced
  position: number | null;
  related_ids: string[];
}

export type UnitStatusValue = "learned" | "needs_review" | "stuck_speaking";

export interface UnitStatus {
  user_id: string;
  unit_id: string;
  status: UnitStatusValue;
  updated_at: string;
}

export interface Review {
  id: string;
  user_id: string;
  unit_id: string;
  ease: number;
  interval_days: number;
  due_date: string | null;
  last_result: string | null;
  stuck_speaking: boolean;
}

export type PlanRole =
  | "main"
  | "phrases"
  | "phrasal_verbs"
  | "pronunciation"
  | "review";

export interface PlanItem {
  unit_id: string;
  role: PlanRole;
  done: boolean;
}

export interface DailyPlan {
  id: string;
  user_id: string;
  date: string;
  theme: string | null;
  status: "pending" | "done" | "skipped";
  items: PlanItem[];
}

export interface ActivityLog {
  id: string;
  user_id: string;
  daily_plan_id: string | null;
  unit_ids: string[];
  activity_type: string | null;
  prompt: string | null;
  response_text: string | null;
  audio_path: string | null;
  duration_seconds: number | null;
  self_rating: number | null;
  stuck_points: string[];
  created_at: string;
}

export interface Profile {
  id: string;
  name: string | null;
  level: string;
  daily_minutes: number;
  streak_current: number;
  streak_best: number;
}

export const MATERIAL_TYPE_LABEL: Record<MaterialType, string> = {
  mindmap: "Mapas mentais",
  phrases: "Frases",
  phrasal_verbs: "Phrasal verbs",
  pronunciation: "Pronúncia",
  exercises: "Exercícios",
};

export const LEVEL_LABEL: Record<string, string> = {
  beginner: "Iniciante",
  intermediate: "Intermediário",
  advanced: "Avançado",
};
