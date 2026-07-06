import { useEffect, useState } from "react";
import { Eye, Mic } from "lucide-react";
import { supabase } from "../lib/supabase";
import { nextReview, todayStr, type ReviewResult } from "../lib/srs";
import type { Material, Review as ReviewRow, Unit } from "../lib/types";
import PdfPage from "../components/PdfPage";

export default function Review() {
  const [queue, setQueue] = useState<ReviewRow[]>([]);
  const [units, setUnits] = useState<Map<string, Unit>>(new Map());
  const [materials, setMaterials] = useState<Map<string, Material>>(new Map());
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: due } = await supabase
        .from("reviews")
        .select("*")
        .lte("due_date", todayStr());
      const q = ((due ?? []) as ReviewRow[]).sort((a, b) => {
        if (a.stuck_speaking !== b.stuck_speaking) return a.stuck_speaking ? -1 : 1;
        return (a.due_date ?? "").localeCompare(b.due_date ?? "");
      });
      setQueue(q);

      if (q.length) {
        const ids = q.map((r) => r.unit_id);
        const { data: us } = await supabase.from("units").select("*").in("id", ids);
        const uMap = new Map<string, Unit>();
        (us ?? []).forEach((u: any) => uMap.set(u.id, u as Unit));
        setUnits(uMap);
        const { data: ms } = await supabase.from("materials").select("*");
        const mMap = new Map<string, Material>();
        (ms ?? []).forEach((m: any) => mMap.set(m.id, m as Material));
        setMaterials(mMap);
      }
    })();
  }, []);

  const current = queue[idx];
  const unit = current ? units.get(current.unit_id) : null;
  const material = unit ? materials.get(unit.material_id) : null;

  async function answer(result: ReviewResult) {
    if (!current) return;
    const nr = nextReview(current, result);
    await supabase
      .from("reviews")
      .update({ ...nr, stuck_speaking: result === "failed" && current.stuck_speaking })
      .eq("id", current.id);
    setRevealed(false);
    setIdx((i) => i + 1);
  }

  if (!queue.length || idx >= queue.length) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-2xl font-bold">Revisão</h1>
        <p className="mt-3 text-slate-400">
          {queue.length === 0
            ? "Nada vencido para revisar hoje. 🎉"
            : "Fila de revisão concluída! 🎉"}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Revisão falada</h1>
        <span className="text-sm text-slate-400">
          {idx + 1}/{queue.length}
        </span>
      </div>

      <div className="mt-4 rounded-xl bg-brand-50 px-5 py-4 text-sm text-brand-700">
        <Mic className="mr-1 inline h-4 w-4" />
        {current.stuck_speaking
          ? "Você travou nesta unidade. Antes de abrir: tente FALAR o conteúdo dela em voz alta agora."
          : "Antes de abrir a página: tente lembrar e falar em voz alta o que ela ensina."}
        {unit?.title && (
          <span className="mt-1 block font-semibold">Unidade: {unit.title}</span>
        )}
      </div>

      {!revealed ? (
        <button
          onClick={() => setRevealed(true)}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 py-24 text-slate-400 hover:border-brand-400 hover:text-brand-500"
        >
          <Eye className="h-5 w-5" /> Falei em voz alta — mostrar a página
        </button>
      ) : (
        <div className="mt-6">
          {material?.file_path && unit && (
            <PdfPage
              filePath={material.file_path}
              pageStart={unit.page_start}
              pageEnd={unit.page_end}
            />
          )}
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={() => answer("failed")}
              className="rounded-lg bg-red-500 px-6 py-2.5 text-sm font-semibold text-white"
            >
              Errei / travei
            </button>
            <button
              onClick={() => answer("hard")}
              className="rounded-lg bg-amber-500 px-6 py-2.5 text-sm font-semibold text-white"
            >
              Difícil
            </button>
            <button
              onClick={() => answer("easy")}
              className="rounded-lg bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-white"
            >
              Fácil
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
