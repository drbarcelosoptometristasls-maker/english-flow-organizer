import { useEffect, useState } from "react";
import { pdfjs } from "react-pdf";
import { CheckCircle2, FileUp, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import type { Material, MaterialType, Unit } from "../lib/types";
import { MATERIAL_TYPE_LABEL } from "../lib/types";

const EXPECTED: { type: MaterialType; title: string; hint: string }[] = [
  { type: "mindmap", title: "Mapas mentais — parte 01", hint: "parte 01" },
  { type: "mindmap", title: "Mapas mentais — parte 02", hint: "parte 02" },
  { type: "phrases", title: "200 frases para praticar", hint: "200 frases" },
  { type: "phrasal_verbs", title: "100 phrasal verbs essenciais", hint: "phrasal verbs" },
  { type: "pronunciation", title: "Guia de pronúncia americana", hint: "pronúncia" },
  { type: "exercises", title: "60 exercícios", hint: "60 exercícios" },
];

/** Nº de páginas por unidade, por tipo de material. */
const PAGES_PER_UNIT: Record<MaterialType, number> = {
  mindmap: 1,
  phrases: 1,
  phrasal_verbs: 1,
  pronunciation: 1,
  exercises: 1,
};

const LEVEL_BY_TYPE: Record<MaterialType, string> = {
  mindmap: "intermediate",
  phrases: "intermediate",
  phrasal_verbs: "intermediate",
  pronunciation: "intermediate",
  exercises: "intermediate",
};

export default function Import() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.from("materials").select("*").order("imported_at");
    setMaterials((data ?? []) as Material[]);
  }
  useEffect(() => {
    load();
  }, []);

  async function handleFile(slot: (typeof EXPECTED)[number], file: File) {
    setBusy(slot.title);
    setError(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user!.id;

      // 1. contar páginas
      const buf = await file.arrayBuffer();
      const doc = await pdfjs.getDocument({ data: buf }).promise;
      const pageCount = doc.numPages;

      // 2. upload
      const path = `${uid}/${slot.type}-${Date.now()}.pdf`;
      const up = await supabase.storage.from("materials").upload(path, file, {
        contentType: "application/pdf",
      });
      if (up.error) throw up.error;

      // 3. material
      const mat = await supabase
        .from("materials")
        .insert({
          user_id: uid,
          title: slot.title,
          type: slot.type,
          file_path: path,
          page_count: pageCount,
        })
        .select()
        .single();
      if (mat.error) throw mat.error;

      // 4. unidades (1 página = 1 unidade por padrão)
      const per = PAGES_PER_UNIT[slot.type];
      const units: Partial<Unit>[] = [];
      let pos = 0;
      for (let p = 1; p <= pageCount; p += per) {
        units.push({
          user_id: uid,
          material_id: (mat.data as Material).id,
          page_start: p,
          page_end: Math.min(p + per - 1, pageCount),
          title: `${slot.title} — pág. ${p}`,
          kind: slot.type,
          level: LEVEL_BY_TYPE[slot.type],
          position: pos++,
        });
      }
      const insUnits = await supabase.from("units").insert(units);
      if (insUnits.error) throw insUnits.error;

      await load();
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setBusy(null);
    }
  }

  const importedTitles = new Set(materials.map((m) => m.title));

  return (
    <div>
      <h1 className="text-2xl font-bold">Materiais</h1>
      <p className="mt-1 text-sm text-slate-500">
        Importe cada PDF uma única vez. O sistema divide tudo em unidades de estudo
        automaticamente — depois disso você nunca mais precisa abrir os arquivos.
      </p>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="mt-6 grid gap-3">
        {EXPECTED.map((slot) => {
          const done = importedTitles.has(slot.title);
          const loading = busy === slot.title;
          return (
            <div
              key={slot.title}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4"
            >
              <div>
                <div className="font-medium">{slot.title}</div>
                <div className="text-xs text-slate-400">
                  {MATERIAL_TYPE_LABEL[slot.type]}
                  {done &&
                    ` · ${
                      materials.find((m) => m.title === slot.title)?.page_count ?? "?"
                    } páginas importadas`}
                </div>
              </div>

              {done ? (
                <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" /> Importado
                </span>
              ) : (
                <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileUp className="h-4 w-4" />
                  )}
                  {loading ? "Importando…" : "Escolher PDF"}
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    disabled={loading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(slot, f);
                    }}
                  />
                </label>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-slate-400">
        Dica: o arquivo "parte 01" e "parte 02" são os mapas mentais. Os nomes dos seus
        arquivos não precisam bater — o que importa é escolher o PDF certo para cada
        linha.
      </p>
    </div>
  );
}
