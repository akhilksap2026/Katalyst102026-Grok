"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

export function cx(...c: (string | false | null | undefined)[]) { return c.filter(Boolean).join(" "); }

export function Card({ children, className, title, actions }: { children: React.ReactNode; className?: string; title?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <section className={cx("rounded-2xl border border-slate-200/80 bg-white shadow-card", className)}>
      {(title || actions) && <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3"><h3 className="text-sm font-semibold text-slate-800">{title}</h3><div className="flex items-center gap-2">{actions}</div></header>}
      <div className="p-5">{children}</div>
    </section>
  );
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "sm" | "md" };
export function Button({ variant = "primary", size = "md", className, ...p }: BtnProps) {
  return <button {...p} className={cx("inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
    size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-3.5 py-2 text-sm",
    variant === "primary" && "bg-brand-600 text-white shadow-sm hover:bg-brand-700",
    variant === "secondary" && "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
    variant === "ghost" && "text-slate-600 hover:bg-slate-100",
    variant === "danger" && "bg-rose-600 text-white hover:bg-rose-700", className)} />;
}

const TONES = { gray: "bg-slate-100 text-slate-700", green: "bg-emerald-50 text-emerald-700 ring-emerald-200", amber: "bg-amber-50 text-amber-800 ring-amber-200", red: "bg-rose-50 text-rose-700 ring-rose-200", blue: "bg-brand-50 text-brand-700 ring-brand-100", violet: "bg-violet-50 text-violet-700 ring-violet-200" };
export function Badge({ tone = "gray", children, className }: { tone?: keyof typeof TONES; children: React.ReactNode; className?: string }) {
  return <span className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ring-transparent", TONES[tone], className)}>{children}</span>;
}
export function statusTone(s: string): keyof typeof TONES {
  return s === "Same" ? "green" : s === "Different" ? "amber" : s.startsWith("Missing") ? "red" : "gray";
}

export function PageHeader({ title, subtitle, icon, actions }: { title: string; subtitle?: string; icon?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="flex items-center gap-3">
        {icon && <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-xl">{icon}</div>}
        <div><h1 className="text-xl font-semibold tracking-tight">{title}</h1>{subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}</div>
      </div>
      {actions}
    </div>
  );
}

export function Alert({ tone = "amber", children }: { tone?: "amber" | "red" | "blue" | "green"; children: React.ReactNode }) {
  const c = { amber: "border-amber-200 bg-amber-50 text-amber-900", red: "border-rose-200 bg-rose-50 text-rose-900", blue: "border-brand-100 bg-brand-50 text-brand-900", green: "border-emerald-200 bg-emerald-50 text-emerald-900" }[tone];
  return <div className={cx("rounded-lg border px-3 py-2 text-sm", c)}>{children}</div>;
}

export function Empty({ icon = "✨", title, children }: { icon?: string; title: string; children?: React.ReactNode }) {
  return <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-slate-500"><div className="text-3xl">{icon}</div><div className="font-medium text-slate-700">{title}</div><div className="max-w-md text-sm">{children}</div></div>;
}

export function Spinner() { return <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />; }

export function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "green" | "amber" | "red" | "blue" }) {
  const c = { green: "text-emerald-600", amber: "text-amber-600", red: "text-rose-600", blue: "text-brand-600" }[tone ?? "blue"];
  return <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div><div className={cx("mt-1 text-2xl font-semibold", c)}>{value}</div></div>;
}

export function Modal({ open, title, children, onClose }: { open: boolean; title: string; children: React.ReactNode; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-3 text-base font-semibold">{title}</h3>{children}
      </div>
    </div>
  );
}

// ---- Toasts (with optional Undo action) ----
interface Toast { id: number; text: string; tone?: "ok" | "err"; action?: { label: string; run: () => void } }
const ToastCtx = createContext<(t: Omit<Toast, "id">, ms?: number) => void>(() => {});
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const n = useRef(0);
  const push = useCallback((t: Omit<Toast, "id">, ms = 3500) => {
    const id = ++n.current;
    setItems((x) => [...x, { ...t, id }]);
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), ms);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed bottom-5 right-5 z-[60] flex flex-col gap-2">
        {items.map((t) => (
          <div key={t.id} className={cx("flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-white shadow-xl", t.tone === "err" ? "bg-rose-600" : "bg-slate-900")}>
            <span>{t.text}</span>
            {t.action && <button className="font-semibold text-brand-100 underline" onClick={() => { t.action!.run(); setItems((x) => x.filter((i) => i.id !== t.id)); }}>{t.action.label}</button>}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

export function useLocalStorage<T>(key: string, init: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(init);
  useEffect(() => { try { const s = localStorage.getItem(key); if (s) setV(JSON.parse(s)); } catch {} }, [key]);
  return [v, (nv: T) => { setV(nv); localStorage.setItem(key, JSON.stringify(nv)); }];
}

export async function api<T = unknown>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, body === undefined ? { cache: "no-store" } : { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(data.error ?? `Request failed (${res.status})`) as Error & { code?: string; status?: number }; e.code = data.code; e.status = res.status; throw e; }
  return data as T;
}
