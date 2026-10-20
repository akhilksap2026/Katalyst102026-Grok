"use client";
import Link from "next/link";
import { useSession, useConnections } from "@/components/session";
import { Badge } from "@/components/ui";
import { FEATURES, PLANS, type Feature } from "@/lib/entitlements";

const JOBS: { title: string; desc: string; href: string; icon: string; feature: Feature; time: string }[] = [
  { title: "Format a list of IDs", desc: "Paste GIDs from Excel or an email; get quoted lists or SQL IN clauses.", href: "/jargon", icon: "🧹", feature: "column_jargon", time: "10 sec" },
  { title: "Build a query across tables", desc: "Pick tables, let Katalyst find the joins, run it safely.", href: "/sql", icon: "🧭", feature: "sql_assist", time: "1 min" },
  { title: "Check agents before go-live", desc: "Same / Different / Missing across Dev, Test and Prod.", href: "/agents", icon: "🤖", feature: "agent_compare", time: "30 sec" },
  { title: "Diff rate offerings", desc: "See which carrier contracts drifted between environments.", href: "/config", icon: "⚖️", feature: "config_compare", time: "30 sec" },
  { title: "Understand an agent", desc: "Visual tree of events, IF/ELSE blocks and dependencies.", href: "/studio", icon: "🌳", feature: "agent_studio", time: "1 min" },
  { title: "Run a pre-migration check", desc: "Guided playbook: agents + config + sign-off checklist.", href: "/playbooks", icon: "▶️", feature: "playbooks", time: "2 min" },
  { title: "Reuse a saved query", desc: "Your library of queries and join templates.", href: "/cockpit", icon: "📚", feature: "query_cockpit", time: "10 sec" },
];

export default function Home() {
  const s = useSession();
  const { conns } = useConnections();
  const connected = Object.values(conns).filter((c) => c.ok).length;
  return (
    <div>
      <div className="mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-[#1b2560] via-brand-700 to-violet-700 p-8 text-white shadow-card">
        <div className="text-sm text-white/70">Good to see you, {s.user.name.split(" ")[0]}</div>
        <h1 className="mt-1 text-3xl font-semibold">What do you need to do?</h1>
        <p className="mt-2 max-w-2xl text-white/75">Pick a job — Katalyst takes you straight to the right tool. Everything is read-only; nothing you do here can change OTM.</p>
        <div className="mt-5 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-white/15 px-3 py-1">Workspace: {s.tenant.name}</span>
          <span className="rounded-full bg-white/15 px-3 py-1">Plan: {PLANS[s.tenant.plan].name}</span>
          <span className="rounded-full bg-white/15 px-3 py-1">{connected} environment{connected === 1 ? "" : "s"} connected</span>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {JOBS.map((j) => {
          const on = s.features.includes(j.feature);
          return (
            <Link key={j.href} href={j.href} className="group relative rounded-2xl border border-slate-200 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:border-brand-500">
              <div className="flex items-start justify-between"><div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-2xl">{j.icon}</div>
                {on ? <Badge tone="green">~{j.time}</Badge> : <Badge tone="violet">🔒 {FEATURES[j.feature].label.split(" ")[0]} · upgrade</Badge>}</div>
              <div className="mt-4 font-semibold group-hover:text-brand-700">{j.title}</div>
              <div className="mt-1 text-sm text-slate-500">{j.desc}</div>
            </Link>
          );
        })}
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[["🔒", "Read-only by design", "Every query passes a SELECT-only guard. DML, DDL, FOR UPDATE and DB links are blocked."], ["🔑", "Secrets stay in your tab", "Client secrets are exchanged for a short-lived token and never stored on a server."], ["🏢", "Your own workspace", "Users, environments, domain maps and features are isolated per customer."]].map(([i, t, d]) => (
          <div key={t} className="rounded-2xl border border-slate-200 bg-white/60 p-5"><div className="text-xl">{i}</div><div className="mt-2 font-medium">{t}</div><div className="text-sm text-slate-500">{d}</div></div>
        ))}
      </div>
    </div>
  );
}
