import { useEffect, useState } from "react";
import { Document, Page } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "../lib/supabase";

/** Cache simples de URLs assinadas por caminho. */
const urlCache = new Map<string, string>();

export async function signedUrl(path: string): Promise<string | null> {
  if (urlCache.has(path)) return urlCache.get(path)!;
  const { data } = await supabase.storage
    .from("materials")
    .createSignedUrl(path, 60 * 60);
  if (data?.signedUrl) {
    urlCache.set(path, data.signedUrl);
    return data.signedUrl;
  }
  return null;
}

export default function PdfPage({
  filePath,
  pageStart,
  pageEnd,
  width = 760,
}: {
  filePath: string;
  pageStart: number;
  pageEnd: number;
  width?: number;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [page, setPage] = useState(pageStart);

  useEffect(() => {
    setPage(pageStart);
    signedUrl(filePath).then(setUrl);
  }, [filePath, pageStart]);

  if (!url) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
        Carregando página…
      </div>
    );
  }

  const multi = pageEnd > pageStart;

  return (
    <div>
      <Document
        file={url}
        loading={
          <div className="flex h-64 items-center justify-center text-slate-400">
            Abrindo PDF…
          </div>
        }
      >
        <Page pageNumber={page} width={width} renderTextLayer={false} renderAnnotationLayer={false} />
      </Document>

      {multi && (
        <div className="mt-3 flex items-center justify-center gap-4">
          <button
            disabled={page <= pageStart}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-full border border-slate-200 p-2 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-slate-500">
            Página {page} de {pageStart}–{pageEnd}
          </span>
          <button
            disabled={page >= pageEnd}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-full border border-slate-200 p-2 disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
