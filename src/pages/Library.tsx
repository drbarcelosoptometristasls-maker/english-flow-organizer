import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { supabase } from "../lib/supabase";
import type { Material, Unit, UnitStatus } from "../lib/types";
import { MATERIAL_TYPE_LABEL } from "../lib/types";
import PdfPage from "../components/PdfPage";

const STATUS_LABEL: Record<string, string> = {
  learned: "Aprendi",
  needs_review: "Preciso revisar",
  stuck_speaking: "Travei na fala",
  none: "Não estudado",
};

export default function Library() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [statuses, setStatuses] = useState<Map<string, string>>(new Map());
  const [filterMat, setFilterMat] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [open, setOpen] = useState<Unit | null>(null);

  useEffect(() => {
    (async () => {
      const [m, u, s] = await Promise.all([
        supabase.from("materials").select("*"),
        supabase.from("units").select("*").order("position"),
        supabase.from("unit_status").select("*"),
      ]);
      setMaterials((m.data ?? []) as Material[]);
      setUnits((u.data ?? []) as Unit[]);
      const map = new Map<string, string>();
      ((s.data ?? []) as UnitStatus[]).forEach((st) => map.set(st.unit_id, st.status));
      setStatuses(map);
    })();
  }, []);

  const matById = useMemo(() => {
    const m = new Map<string, Material>();
    materials.forEach((x) => m.set(x.id, x));
    return m;
  }, [materials]);

  const filtered = units.filter((u) => {
    if (filterMat !== "all" && u.material_id !== filterMat) return false;
    const st = statuses.get(u.id) ?? "none";
    if (filterStatus !== "all" && st !== filterStatus) return false;
    return true;
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Biblioteca</h1>
      <p className="mt-1 text-sm text-slate-500">
        Todo o conteúdo dos seus 6 materiais, organizado em unidades.
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        <select
          value={filterMat}
          onChange={(e) => setFilterMat(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <option value="all">Todos os materiais</option>
          {materials.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <option value="all">Todos os status</option>
          <option value="none">Não estudado</option>
          <option value="learned">Aprendi</option>
          <option value="needs_review">Preciso revisar</option>
          <option value="stuck_speaking">Travei na fala</option>
        </select>
        <span className="self-center text-sm text-slate-400">
          {filtered.length} unidades
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {filtered.map((u) => {
          const st = statuses.get(u.id) ?? "none";
          const mat = matById.get(u.material_id);
          return (
            <button
              key={u.id}
              onClick={() => setOpen(u)}
              className="rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-brand-300 hover:shadow"
            >
              <div className="text-xs text-slate-400">
                {mat ? MATERIAL_TYPE_LABEL[mat.type] : ""} · pág. {u.page_start}
                {u.page_end > u.page_start ? `–${u.page_end}` : ""}
              </div>
              <div className="mt-1 line-clamp-2 text-sm font-medium">
                {u.title ?? `Página ${u.page_start}`}
              </div>
              <span
                className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs ${
                  st === "learned"
                    ? "bg-emerald-50 text-emerald-600"
                    : st === "needs_review"
                    ? "bg-amber-50 text-amber-600"
                    : st === "stuck_speaking"
                    ? "bg-red-50 text-red-600"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                {STATUS_LABEL[st]}
              </span>
            </button>
          );
        })}
      </div>

      {open && matById.get(open.material_id)?.file_path && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
          onClick={() => setOpen(null)}
        >
          <div
            className="max-h-full w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">{open.title}</h2>
              <button onClick={() => setOpen(null)}>
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            <PdfPage
              filePath={matById.get(open.material_id)!.file_path!}
              pageStart={open.page_start}
              pageEnd={open.page_end}
              width={680}
            />
          </div>
        </div>
      )}
    </div>
  );
}
