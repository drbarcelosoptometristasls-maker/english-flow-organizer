import { useState } from "react";
import { Mic } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const fn =
      mode === "signin"
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password });
    const { error } = await fn;
    if (error) setMsg(error.message);
    else if (mode === "signup")
      setMsg("Conta criada! Confira seu e-mail para confirmar o cadastro.");
    setBusy(false);
  }

  return (
    <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-50 to-brand-50">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-brand-500 p-2.5">
            <Mic className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold">English Flow Organizer</h1>
            <p className="text-xs text-slate-400">Destrave sua fala, um dia de cada vez</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            type="email"
            required
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-brand-500"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-brand-500"
          />
          <button
            disabled={busy}
            className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {mode === "signin" ? "Entrar" : "Criar conta"}
          </button>
        </form>

        {msg && <p className="mt-3 text-center text-xs text-slate-500">{msg}</p>}

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 w-full text-center text-xs text-brand-600 hover:underline"
        >
          {mode === "signin"
            ? "Primeira vez? Criar conta"
            : "Já tenho conta — entrar"}
        </button>
      </div>
    </div>
  );
}
