import { createClient } from "@supabase/supabase-js";

// Fallbacks: a chave publicável é segura para uso no cliente (RLS protege os dados).
const url =
  (import.meta.env.VITE_SUPABASE_URL as string) ??
  "https://kepkyomwbpkqebuaqvii.supabase.co";
const key =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ??
  "sb_publishable_QJHki81KfAtOU24SuDGs8g_HtGzTp_M";

export const supabase = createClient(url, key);
