"use client";
import { useState } from "react";
import { Badge, Button, Card, PageHeader, Alert, Spinner, api, cx } from "@/components/ui";
import { Gate } from "@/components/Upgrade";
import { useConnections, useSession } from "@/components/session";
import { useConnectAll } from "@/components/EnvHealth";
import { AgentResults, ConfigResults, type Resp, type ConfigResp } from "@/components/CompareViews";
import { defaultMaps } from "@/components/EnvPair";

const BOOKS = [
  { id: "premig", title: "Pre-migration check", desc: "Dev → Prod: agents, saved conditions and rate offerings, with a sign-off checklist.", ready: true },
  { id: "smoke", title: "Post-cutover smoke test", desc: "Row counts on key tables in Prod vs Test." },
  { id: "orphans", title: "Find orphan agents", desc: "Inactive agents and agents with missing references." },
];
type Step = { label: string; state: "todo" | "run" | "ok" | "warn" | "err"; note?: string };

function PlaybooksInner() {
  const s = useSession();
  const { tokens } = useConnections();
  const connectAll = useConnectAll();
  const [steps, setSteps] = useState<Step[]>([]);
  const [agents, setAgents] = useState<Resp | null>(null);
  const [config, setConfig] = useState<ConfigResp | null>(null);
  const [running, setRunning] = useState(false);
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const run = async () => {
    setRunning(true); setAgents(null); setConfig(null);
    const st: Step[] = [{ label: "Connect Dev and Prod", state: "run" }, { label: "Compare agents (with domain mapping)", state: "todo" }, { label: "Compare rate offerings", state: "todo" }, { label: "Build sign-off checklist", state: "todo" }];
    const upd = (i: number, p: Partial<Step>) => { st[i] = { ...st[i], ...p }; setSteps([...st]); };
    setSteps([...st]);
    let tk = tokens;
    if (!tk.dev || !tk.prod) { await connectAll(); tk = JSON.parse(sessionStorage.getItem(`katalyst:otm:${s.tenant.id}`) ?? "{}"); tk = Object.fromEntries(Object.entries(tk).map(([k, v]) => [k, (v as unknown as { token: string }).token])); }
    upd(0, { state: tk.dev && tk.prod ? "ok" : "err", note: tk.dev && tk.prod ? "Connected" : "Could not connect" });
    if (!tk.dev || !tk.prod) { setRunning(false); return; }
    const maps = defaultMaps(s.tenant.domain, "dev", "prod");
    upd(1, { state: "run" });
    try { const a = await api<Resp>("/api/agents/compare", { source: "dev", target: "prod", tokens: tk, maps }); setAgents(a); upd(1, { state: a.summary.different + a.summary.missing ? "warn" : "ok", note: `${a.summary.different} different · ${a.summary.missing} missing` }); }
    catch (e) { upd(1, { state: "err", note: (e as Error).message }); }
    upd(2, { state: "run" });
    try { const c = await api<ConfigResp>("/api/config/compare", { source: "dev", target: "prod", tokens: tk, maps }); setConfig(c); upd(2, { state: c.summary.different + c.summary.missing ? "warn" : "ok", note: `${c.summary.different} different · ${c.summary.missing} missing` }); }
    catch (e) { upd(2, { state: "err", note: (e as Error).message }); }
    upd(3, { state: "ok", note: "Review below" });
    setRunning(false);
  };
  const checklist = [
    ...(agents?.results.filter((r) => r.status === "Missing in target").map((r) => `Migrate agent ${r.gid} to Prod (and its saved conditions)`) ?? []),
    ...(agents?.results.filter((r) => r.status === "Different").map((r) => `Resolve ${r.diffs.length} difference(s) in ${r.gid} — ${r.reason}`) ?? []),
    ...(agents?.results.filter((r) => r.status === "Missing in source").map((r) => `Decide: deactivate Prod-only agent ${r.gid}?`) ?? []),
    ...(config?.results.filter((r) => r.status !== "Same").map((r) => `Rate offering ${r.gid}: ${r.status}${r.diffs.length ? " (" + r.diffs.map((d) => d.field).join(", ") + ")" : ""}`) ?? []),
  ];
  const icon = { todo: "○", run: "◌", ok: "✅", warn: "⚠️", err: "⛔" };
  return (
    <div>
      <PageHeader icon="▶️" title="Playbooks" subtitle="Guided, one-click flows for the jobs you do every project." />
      <div className="grid gap-4 md:grid-cols-3">
        {BOOKS.map((b) => (
          <div key={b.id} className={cx("rounded-2xl border bg-white p-5 shadow-card", b.ready ? "border-brand-500" : "border-slate-200 opacity-70")}>
            <div className="flex items-center justify-between"><div className="font-semibold">{b.title}</div>{!b.ready && <Badge>soon</Badge>}</div>
            <p className="mt-1 text-sm text-slate-500">{b.desc}</p>
            {b.ready && <Button className="mt-4" onClick={run} disabled={running}>{running ? <Spinner /> : "▶"} Run playbook</Button>}
          </div>
        ))}
      </div>
      {steps.length > 0 && (
        <Card className="mt-4" title="Pre-migration check · Dev → Prod">
          <ol className="space-y-2">{steps.map((st, i) => <li key={i} className="flex items-center gap-3 text-sm"><span className="w-6 text-center">{st.state === "run" ? <Spinner /> : icon[st.state]}</span><span className="font-medium">{st.label}</span><span className="text-slate-500">{st.note}</span></li>)}</ol>
        </Card>
      )}
      {checklist.length > 0 && (
        <Card className="mt-4" title={`Sign-off checklist · ${Object.values(checked).filter(Boolean).length}/${checklist.length} done`}>
          <div className="space-y-1.5">{checklist.map((c, i) => <label key={i} className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={!!checked[i]} onChange={(e) => setChecked({ ...checked, [i]: e.target.checked })} /><span className={checked[i] ? "text-slate-400 line-through" : ""}>{c}</span></label>)}</div>
          <div className="mt-4"><Alert tone="blue">Katalyst never writes to OTM. Use this checklist with your migration tool (CSV/XML export) and re-run the playbook to confirm.</Alert></div>
        </Card>
      )}
      {agents && <div className="mt-6"><h2 className="mb-3 font-semibold">Agents</h2><AgentResults data={agents} /></div>}
      {config && <div className="mt-6"><h2 className="mb-3 font-semibold">Rate offerings</h2><ConfigResults data={config} /></div>}
    </div>
  );
}
export default function Page() { return <Gate feature="playbooks"><PlaybooksInner /></Gate>; }
