"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "./session";
import { EnvHealthStrip } from "./EnvHealth";
import { cx, api } from "./ui";
import { PLANS, type Feature } from "@/lib/entitlements";

const NAV: { group: string; items: { href: string; label: string; icon: string; feature?: Feature }[] }[] = [
  { group: "", items: [{ href: "/", label: "Home", icon: "🏠" }] },
  { group: "Prepare data", items: [{ href: "/jargon", label: "Column Jargon", icon: "🧹", feature: "column_jargon" }] },
  { group: "Query & understand", items: [{ href: "/sql", label: "SQL Assist", icon: "🧭", feature: "sql_assist" }, { href: "/cockpit", label: "Query Cockpit", icon: "📚", feature: "query_cockpit" }] },
  { group: "Compare & govern", items: [{ href: "/agents", label: "Agent Compare", icon: "🤖", feature: "agent_compare" }, { href: "/config", label: "Config Compare", icon: "⚖️", feature: "config_compare" }, { href: "/studio", label: "Agent Studio", icon: "🌳", feature: "agent_studio" }] },
  { group: "Guided delivery", items: [{ href: "/playbooks", label: "Playbooks", icon: "▶️", feature: "playbooks" }] },
  { group: "Workspace", items: [{ href: "/connections", label: "Connections", icon: "🔌" }, { href: "/plans", label: "Plan & features", icon: "💎" }, { href: "/audit", label: "Audit log", icon: "🧾", feature: "audit_log" }] },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const s = useSession();
  const path = usePathname();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const has = (f?: Feature) => !f || s.features.includes(f);
  const switchTo = async (id: string) => { setBusy(true); await api("/api/auth/switch", { tenantId: id }); router.refresh(); setBusy(false); };
  const logout = async () => { await api("/api/auth/logout", {}); sessionStorage.clear(); router.push("/login"); router.refresh(); };
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 text-lg font-bold text-white">K</div>
          <div><div className="font-semibold leading-tight">Katalyst</div><div className="text-[11px] text-slate-500">OTM Consultant OS</div></div>
        </div>
        <div className="px-3">
          <label className="label px-2">Workspace</label>
          <select disabled={busy} className="input" value={s.tenant.id} onChange={(e) => switchTo(e.target.value)}>
            {s.tenants.map((t) => <option key={t.id} value={t.id}>{t.kind === "partner" ? "🤝 " : ""}{t.name}{t.status === "suspended" ? " (suspended)" : ""}</option>)}
          </select>
          <div className="mt-2 flex items-center gap-2 px-1 text-xs text-slate-500">
            <span className="rounded bg-brand-50 px-1.5 py-0.5 font-semibold text-brand-700">{PLANS[s.tenant.plan].name}</span>
            <span>· {s.role}</span>{s.tenant.kind === "partner" && <span>· partner</span>}
          </div>
        </div>
        <nav className="scroll-thin mt-4 flex-1 overflow-y-auto px-3 pb-4">
          {NAV.map((g) => (
            <div key={g.group} className="mb-3">
              {g.group && <div className="px-2 pb-1 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">{g.group}</div>}
              {g.items.map((i) => {
                const active = i.href === "/" ? path === "/" : path.startsWith(i.href);
                return (
                  <Link key={i.href} href={i.href} className={cx("flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm", active ? "bg-brand-50 font-medium text-brand-700" : "text-slate-600 hover:bg-slate-50")}>
                    <span className="w-5 text-center">{i.icon}</span><span className="flex-1">{i.label}</span>
                    {!has(i.feature) && <span title="Not in your plan" className="text-xs">🔒</span>}
                  </Link>
                );
              })}
            </div>
          ))}
          {s.user.superAdmin && (
            <div className="mb-3"><div className="px-2 pb-1 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">Platform</div>
              <Link href="/admin" className={cx("flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm", path.startsWith("/admin") ? "bg-violet-50 font-medium text-violet-700" : "text-slate-600 hover:bg-slate-50")}><span className="w-5 text-center">🛡️</span>Super-admin console</Link>
            </div>
          )}
        </nav>
        <div className="border-t border-slate-100 p-4 text-sm">
          <div className="font-medium">{s.user.name}</div>
          <div className="truncate text-xs text-slate-500">{s.user.email}</div>
          <button onClick={logout} className="mt-2 text-xs font-medium text-brand-600 hover:underline">Sign out</button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white/85 px-6 py-2.5 backdrop-blur">
          <select className="input w-auto lg:hidden" value={s.tenant.id} onChange={(e) => switchTo(e.target.value)}>
            {s.tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <div className="text-sm text-slate-500"><span className="font-medium text-slate-800">{s.tenant.name}</span> · OTM domain <span className="mono">{s.tenant.domain}</span> · {s.tenant.region}</div>
          <div className="ml-auto"><EnvHealthStrip /></div>
        </header>
        {s.tenant.status === "suspended" && <div className="bg-rose-600 px-6 py-2 text-sm text-white">This workspace is suspended. All modules are disabled until a platform admin reactivates it.</div>}
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
