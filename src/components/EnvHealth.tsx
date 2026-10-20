"use client";
import Link from "next/link";
import { useState } from "react";
import { useConnections, useSession } from "./session";
import { api, cx, useToast } from "./ui";
import { canUseEnv } from "@/lib/entitlements";
import type { TokenResult } from "@/lib/otm/connector";

export function useConnectAll() {
  const s = useSession();
  const { save } = useConnections();
  const toast = useToast();
  return async () => {
    const envs = s.tenant.envs.filter((e) => canUseEnv(s.tenant, e.id).ok);
    for (const e of envs) {
      try {
        const t = await api<TokenResult>("/api/otm/connect", { env: e.id, secret: "demo-secret" });
        save(e.id, { token: t.token, otmUser: t.otmUser, domain: t.domain, version: t.version, at: Date.now(), ok: true });
      } catch (err) { save(e.id, { token: "", otmUser: e.otmUser, domain: e.domain, version: "", at: Date.now(), ok: false, error: (err as Error).message }); }
    }
    toast({ text: `Connected ${envs.map((e) => e.label).join(", ")} (demo)` });
  };
}

export function EnvHealthStrip() {
  const s = useSession();
  const { conns } = useConnections();
  const connectAll = useConnectAll();
  const [busy, setBusy] = useState(false);
  const detailed = s.features.includes("env_health");
  return (
    <div className="flex items-center gap-2">
      {s.tenant.envs.map((e) => {
        const allowed = canUseEnv(s.tenant, e.id).ok;
        const c = conns[e.id];
        const state = !allowed ? "locked" : c?.ok ? "ok" : c ? "err" : "off";
        return (
          <Link key={e.id} href="/connections" title={!allowed ? canUseEnv(s.tenant, e.id).reason : c?.ok ? `${c.otmUser} · domain ${c.domain} · ${c.version} · connected ${new Date(c.at).toLocaleTimeString()}` : c?.error ?? "Not connected"}
            className={cx("flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs", state === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : state === "err" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-slate-200 bg-white text-slate-500")}>
            <span className={cx("h-2 w-2 rounded-full", state === "ok" ? "bg-emerald-500" : state === "err" ? "bg-rose-500" : state === "locked" ? "bg-slate-300" : "bg-amber-400")} />
            <span className="font-semibold">{e.label}</span>
            {state === "locked" && "🔒"}
            {detailed && state === "ok" && <span className="hidden xl:inline text-emerald-700/80">· {c!.otmUser}</span>}
            {e.id === "prod" && allowed && <span className="rounded bg-rose-100 px-1 text-[9px] font-bold text-rose-700">PROD</span>}
          </Link>
        );
      })}
      {s.tenant.envs.some((e) => canUseEnv(s.tenant, e.id).ok && !conns[e.id]?.ok) && (
        <button disabled={busy} onClick={async () => { setBusy(true); await connectAll(); setBusy(false); }} className="rounded-full bg-brand-600 px-3 py-1 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-60">{busy ? "Connecting…" : "Connect demo envs"}</button>
      )}
    </div>
  );
}
