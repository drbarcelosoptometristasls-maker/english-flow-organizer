import { useEffect, useState } from "react";
import { pdfjs } from "react-pdf";
import { PDFDocument } from "pdf-lib";
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

/** Limite do Supabase Free é 50 MB; dividimos acima de 40 MB por segurança. */
const MAX_CHUNK_BYTES = 40 * 1024 * 1024;

async function splitPdf(buf: ArrayBuffer, parts: number): Promise<Uint8Array[]> {
  const src = await PDFDocument.load(buf, { ignoreEncryption: true });
  const total = src.getPageCount();
  const per = Math.ceil(total / parts);
  const out: Uint8Array[] = [];
  for (let i = 0; i < total; i += per) {
    const doc = await PDFDocument.create();
    const idxs = Array.from(
      { length: Math.min(per, total - i) },
      (_, k) => i + k
    );
    const pages = await doc.copyPages(src, idxs);
    pages.forEach((p) => doc.addPage(p));
    out.push(await doc.save());
  }
  return out;
}

export default function Import() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.from("materials").select("*").order("imported_at");
    setMaterials((data ?? []) as Material[]);
  }
  useEffect(() => {
    load();
  }, []);

  async function createMaterialWithUnits(
    uid: string,
    title: string,
    type: MaterialType,
    bytes: Uint8Array | ArrayBuffer,
    positionOffset: number
  ): Promise<number> {
    const blob = new Blob([bytes], { type: "application/pdf" });

    const doc = await pdfjs.getDocument({
      data: bytes instanceof Uint8Array ? bytes.slice() : bytes.slice(0),
    }).promise;
    const pageCount = doc.numPages;

    const path = `${uid}/${type}-${Date.now()}-${Math.round(Math.random() * 1e6)}.pdf`;
    const up = await supabase.storage.from("materials").upload(path, blob, {
      contentType: "application/pdf",
    });
    if (up.error) throw up.error;

    const mat = await supabase
      .from("materials")
      .insert({
        user_id: uid,
        title,
        type,
        file_path: path,
        page_count: pageCount,
      })
      .select()
      .single();
    if (mat.error) throw mat.error;

    const units: Partial<Unit>[] = [];
    for (let p = 1; p <= pageCount; p++) {
      units.push({
        user_id: uid,
        material_id: (mat.data as Material).id,
        page_start: p,
        page_end: p,
        title: `${title} — pág. ${p}`,
        kind: type,
        level: "intermediate",
        position: positionOffset + p - 1,
      });
    }
    const insUnits = await supabase.from("units").insert(units);
    if (insUnits.error) throw insUnits.error;

    return pageCount;
  }

  async function handleFile(slot: (typeof EXPECTED)[number], file: File) {
    setBusy(slot.title);
    setError(null);
    setProgress("");
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user!.id;
      const buf = await file.arrayBuffer();

      if (file.size <= MAX_CHUNK_BYTES) {
        setProgress("Enviando…");
        await createMaterialWithUnits(uid, slot.title, slot.type, buf, 0);
      } else {
        // arquivo grande: dividir em partes < 40 MB
        const parts = Math.ceil(file.size / MAX_CHUNK_BYTES);
        setProgress(`Arquivo grande — dividindo em ${parts} partes…`);
        const chunks = await splitPdf(buf, parts);
        let offset = 0;
        for (let i = 0; i < chunks.length; i++) {
          setProgress(`Enviando parte ${i + 1}/${chunks.length}…`);
          const title = `${slot.title} (${i + 1}/${chunks.length})`;
          const pages = await createMaterialWithUnits(
            uid,
            title,
            slot.type,
            chunks[i],
            offset
          );
          offset += pages;
        }
      }

      await load();
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setBusy(null);
      setProgress("");
    }
  }

  const importedBase = new Set(
    materials.map((m) => m.title.replace(/ \(\d+\/\d+\)$/, ""))
  );

  return (
    <div>
      <h1 className="text-2xl font-bold">Materiais</h1>
      <p className="mt-1 text-sm text-slate-500">
        Importe cada PDF uma única vez. O sistema divide tudo em unidades de estudo
        automaticamente — depois disso você nunca mais precisa abrir os arquivos.
        Arquivos muito grandes são divididos em partes sozinhos.
      </p>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="mt-6 grid gap-3">
        {EXPECTED.map((slot) => {
          const done = importedBase.has(slot.title);
          const loading = busy === slot.title;
          const pages = materials
            .filter((m) => m.title.replace(/ \(\d+\/\d+\)$/, "") === slot.title)
            .reduce((acc, m) => acc + (m.page_count ?? 0), 0);
          return (
            <div
              key={slot.title}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4"
            >
              <div>
                <div className="font-medium">{slot.title}</div>
                <div className="text-xs text-slate-400">
                  {MATERIAL_TYPE_LABEL[slot.type]}
                  {done && ` · ${pages} páginas importadas`}
                  {loading && progress && ` · ${progress}`}
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
        Dica: "parte 01" e "parte 02" são os mapas mentais. Os nomes dos seus arquivos
        não precisam bater — o que importa é escolher o PDF certo para cada linha.
      </p>
    </div>
  );
}
