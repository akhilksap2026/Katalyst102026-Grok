"use client";
import { useEffect, useState } from "react";
import { Badge, Card, PageHeader, Alert, Spinner, api, cx } from "@/components/ui";
import { Gate } from "@/components/Upgrade";
import { useConnections, useSession } from "@/components/session";
import { canUseEnv } from "@/lib/entitlements";
import type { Agent, AgentAction } from "@/lib/agentDiff";

function Block({ actions, parent, depth = 0 }: { actions: AgentAction[]; parent: string; depth?: number }) {
  const items = actions.filter((a) => a.parent === parent).sort((a, b) => a.seq - b.seq);
  return (
    <div className={cx("space-y-2", depth > 0 && "ml-6 border-l-2 border-dashed border-slate-200 pl-4")}>
      {items.map((a) => {
        const n = a.parent === "ROOT" ? a.seq : a.parent.split("-")[1];
        return (
          <div key={`${a.parent}${a.seq}`}>
            <div className={cx("rounded-xl border px-3 py-2", a.action === "IF" ? "border-violet-200 bg-violet-50" : "border-slate-200 bg-white")}>
              <div className="flex items-center gap-2"><span className="text-xs text-slate-400">{a.parent}#{a.seq}</span><b className="text-sm">{a.action}</b>{a.notify && <Badge tone="blue">✉ {a.notify}</Badge>}</div>
              <div className="mono mt-0.5 text-slate-600">{a.params}</div>
            </div>
            {a.action === "IF" && (<>
              <div className="ml-6 mt-2 text-xs font-semibold text-emerald-700">THEN</div><Block actions={actions} parent={`IF-${n}`} depth={depth + 1} />
              {actions.some((x) => x.parent === `ELSE-${n}`) && (<><div className="ml-6 mt-2 text-xs font-semibold text-rose-700">ELSE</div><Block actions={actions} parent={`ELSE-${n}`} depth={depth + 1} /></>)}
            </>)}
          </div>
        );
      })}
    </div>
  );
}

function StudioInner() {
  const s = useSession();
  const { tokens } = useConnections();
  const [env, setEnv] = useState("dev");
  const [data, setData] = useState<{ agents: Agent[]; conditions: Record<string, string> } | null>(null);
  const [sel, setSel] = useState<string>("");
  const [err, setErr] = useState("");
  useEffect(() => {
    setErr(""); setData(null);
    if (!tokens[env]) { setErr(`Connect ${env.toUpperCase()} first (top right: “Connect demo envs”).`); return; }
    api<{ agents: Agent[]; conditions: Record<string, string> }>("/api/agents/list", { env, token: tokens[env] }).then((d) => { setData(d); setSel(d.agents[0]?.gid ?? ""); }).catch((e) => setErr(e.message));
  }, [env, tokens[env]]); // eslint-disable-line react-hooks/exhaustive-deps
  const a = data?.agents.find((x) => x.gid === sel);
  const refs = a ? [...new Set([...a.events.map((e) => e.savedCondition).filter(Boolean) as string[], ...a.actions.flatMap((x) => (x.params.match(/[A-Z0-9_]+\.[A-Z0-9_\-]+/g) ?? []).filter((g) => !g.startsWith("PUBLIC."))), ...a.actions.map((x) => x.notify).filter(Boolean) as string[]])] : [];
  return (
    <div>
      <PageHeader icon="🌳" title="Agent Studio" subtitle="See what an agent really does: trigger → conditions → IF/ELSE → actions, and what it depends on."
        actions={<select className="input w-auto" value={env} onChange={(e) => setEnv(e.target.value)}>{s.tenant.envs.map((e) => <option key={e.id} value={e.id} disabled={!canUseEnv(s.tenant, e.id).ok}>{e.label}</option>)}</select>} />
      {err && <Alert>{err}</Alert>}
      {!data && !err && <Spinner />}
      {data && (
        <div className="grid gap-4 lg:grid-cols-[300px_1fr_320px]">
          <Card title={`Agents (${data.agents.length})`}>
            <div className="space-y-1">{data.agents.map((x) => <button key={x.gid} onClick={() => setSel(x.gid)} className={cx("w-full rounded-lg px-2 py-1.5 text-left", sel === x.gid ? "bg-brand-50 text-brand-700" : "hover:bg-slate-50")}><div className="mono text-xs font-medium">{x.gid.split(".")[1]}</div><div className="flex items-center gap-1 text-xs text-slate-500">{!x.isActive && <Badge tone="red">inactive</Badge>}{x.description}</div></button>)}</div>
          </Card>
          {a && (
            <Card title={<span className="mono">{a.gid}</span>} actions={a.isActive ? <Badge tone="green">Active</Badge> : <Badge tone="red">Inactive</Badge>}>
              <p className="mb-4 text-sm text-slate-600">{a.description} · data query type <b>{a.dataQueryType}</b></p>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Triggered by</div>
              {a.events.map((e) => <div key={e.seq} className="mb-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm">⚡ <b>{e.event}</b>{e.savedCondition && <> when <span className="mono">{e.savedCondition}</span></>}</div>)}
              <div className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">Then</div>
              <Block actions={a.actions} parent="ROOT" />
            </Card>
          )}
          {a && (
            <Card title="Dependencies & blast radius">
              <div className="space-y-2 text-sm">
                {refs.length === 0 && <p className="text-slate-500">No domain objects referenced.</p>}
                {refs.map((r) => (
                  <div key={r} className="rounded-lg border border-slate-200 p-2">
                    <div className="mono font-medium">{r}</div>
                    {data.conditions[r] && <div className="mono mt-1 text-[11px] text-slate-500">{data.conditions[r]}</div>}
                    <div className="mt-1 text-xs text-slate-500">Also used by: {data.agents.filter((o) => o.gid !== a.gid && JSON.stringify(o).includes(r)).map((o) => o.gid.split(".")[1]).join(", ") || "no other agent"}</div>
                  </div>
                ))}
                <Alert tone="blue">Before migrating this agent, move the {refs.length} referenced object(s) first.</Alert>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
export default function Page() { return <Gate feature="agent_studio"><StudioInner /></Gate>; }
