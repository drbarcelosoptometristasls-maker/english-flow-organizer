import { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import {
  BookOpen,
  Calendar,
  Flame,
  Home,
  Library as LibraryIcon,
  LogOut,
  Map,
  Mic,
  RefreshCw,
  Upload,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import type { Profile } from "../lib/types";

const nav = [
  { to: "/", label: "Início", icon: Home },
  { to: "/estudo", label: "Estudo do dia", icon: BookOpen },
  { to: "/trilha", label: "Trilha", icon: Map },
  { to: "/revisao", label: "Revisão", icon: RefreshCw },
  { to: "/biblioteca", label: "Biblioteca", icon: LibraryIcon },
  { to: "/progresso", label: "Progresso", icon: Calendar },
  { to: "/importar", label: "Materiais", icon: Upload },
];

export default function Layout({
  children,
  profile,
}: {
  children: ReactNode;
  profile: Profile | null;
}) {
  return (
    <div className="flex h-full">
      <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="flex items-center gap-2 px-5 py-5">
          <Mic className="h-6 w-6 text-brand-600" />
          <div className="leading-tight">
            <div className="text-sm font-bold">English Flow</div>
            <div className="text-xs text-slate-400">Organizer</div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-100"
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-200 p-4">
          {profile && (
            <div className="mb-3 flex items-center gap-2 text-sm">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="font-semibold">{profile.streak_current}</span>
              <span className="text-slate-400">dias seguidos</span>
            </div>
          )}
          <button
            onClick={() => supabase.auth.signOut()}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-600"
          >
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
