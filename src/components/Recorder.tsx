import { useEffect, useRef, useState } from "react";
import { Mic, Square, Play, Trash2 } from "lucide-react";

export default function Recorder({
  onRecorded,
}: {
  onRecorded: (blob: Blob | null, durationSeconds: number) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [seconds, setSeconds] = useState(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      mediaRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => chunksRef.current.push(e.data);
      rec.onstop = () => {
        const b = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        setBlob(b);
        stream.getTracks().forEach((t) => t.stop());
      };
      rec.start();
      mediaRef.current = rec;
      setBlob(null);
      setSeconds(0);
      setRecording(true);
      timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      alert("Não consegui acessar o microfone. Verifique as permissões do navegador.");
    }
  }

  function stop() {
    mediaRef.current?.stop();
    setRecording(false);
    if (timerRef.current) window.clearInterval(timerRef.current);
  }

  useEffect(() => {
    onRecorded(blob, seconds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blob]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="flex items-center gap-4">
      {!recording && !blob && (
        <button
          onClick={start}
          className="flex items-center gap-2 rounded-full bg-red-500 px-5 py-3 font-semibold text-white shadow hover:bg-red-600"
        >
          <Mic className="h-5 w-5" /> Gravar
        </button>
      )}

      {recording && (
        <button
          onClick={stop}
          className="flex items-center gap-2 rounded-full bg-slate-800 px-5 py-3 font-semibold text-white shadow"
        >
          <Square className="h-4 w-4" /> Parar · {mm}:{ss}
        </button>
      )}

      {blob && (
        <>
          <audio controls src={URL.createObjectURL(blob)} className="h-10" />
          <button
            onClick={() => {
              setBlob(null);
              setSeconds(0);
              onRecorded(null, 0);
            }}
            className="flex items-center gap-1 text-sm text-slate-400 hover:text-red-500"
          >
            <Trash2 className="h-4 w-4" /> Regravar
          </button>
        </>
      )}

      {recording && (
        <span className="flex items-center gap-2 text-sm text-red-500">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
          gravando…
        </span>
      )}
    </div>
  );
}
