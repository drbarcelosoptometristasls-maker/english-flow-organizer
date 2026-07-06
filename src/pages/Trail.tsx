import { useEffect, useState } from "react";
import { CheckCircle2, Circle, CircleDot } from "lucide-react";
import { supabase } from "../lib/supabase";
import type { Material, Unit, UnitStatus } from "../lib/types";
import { MATERIAL_TYPE_LABEL } from "../lib/types";

export default function Trail() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [statuses, setStatuses] = useState<Map<string, string>>(new Map());

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

  if (materials.length === 0) {
    return (
      <div className="py-20 text-center text-slate-400">
        Importe seus materiais para montar a trilha.
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Trilha de estudo</h1>
      <p className="mt-1 text-sm text-slate-500">
        Sua posição em cada material. O plano diário avança automaticamente por aqui.
      </p>

      <div className="mt-8 space-y-8">
        {materials.map((mat) => {
          const matUnits = units.filter((u) => u.material_id === mat.id);
          const learned = matUnits.filter(
            (u) => statuses.get(u.id) === "learned"
          ).length;
          const pct = matUnits.length
            ? Math.round((learned / matUnits.length) * 100)
            : 0;
          const nextIdx = matUnits.findIndex(
            (u) => statuses.get(u.id) !== "learned"
          );

          return (
            <div key={mat.id} className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{mat.title}</div>
                  <div className="text-xs text-slate-400">
                    {MATERIAL_TYPE_LABEL[mat.type]} · {learned}/{matUnits.length}{" "}
                    unidades · {pct}%
                  </div>
                </div>
                <div className="text-2xl font-bold text-brand-600">{pct}%</div>
              </div>

              <div className="mt-3 h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-brand-500"
                  style={{ width: `${pct}%` }}
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {matUnits.map((u, idx) => {
                  const st = statuses.get(u.id);
                  const isNext = idx === nextIdx;
                  return (
                    <span key={u.id} title={u.title ?? `pág. ${u.page_start}`}>
                      {st === "learned" ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      ) : st === "stuck_speaking" ? (
                        <CircleDot className="h-5 w-5 text-red-400" />
                      ) : st === "needs_review" ? (
                        <CircleDot className="h-5 w-5 text-amber-400" />
                      ) : isNext ? (
                        <CircleDot className="h-5 w-5 animate-pulse text-brand-500" />
                      ) : (
                        <Circle className="h-5 w-5 text-slate-200" />
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
