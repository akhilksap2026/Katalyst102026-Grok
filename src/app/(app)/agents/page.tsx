"use client";
import { useState } from "react";
import { Button, Card, PageHeader, Alert, Spinner, api } from "@/components/ui";
import { Gate } from "@/components/Upgrade";
import { EnvPair, defaultMaps } from "@/components/EnvPair";
import { useConnections, useSession } from "@/components/session";
import type { DomainMap } from "@/lib/agentDiff";
import { AgentResults, type Resp } from "@/components/CompareViews";

function AgentsInner() {
  const s = useSession();
  const { tokens } = useConnections();
  const [source, setSource] = useState("dev");
  const [target, setTarget] = useState(s.features.includes("prod_access") ? "prod" : "test");
  const [maps, setMaps] = useState<DomainMap[]>(defaultMaps(s.tenant.domain, "dev", s.features.includes("prod_access") ? "prod" : "test"));
  const [data, setData] = useState<Resp | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true); setErr("");
    try { setData(await api<Resp>("/api/agents/compare", { source, target, tokens, maps })); }
    catch (e) { setErr((e as Error).message + (Object.keys(tokens).length ? "" : " — connect your environments first (top right).")); }
    setBusy(false);
  };
  return (
    <div>
      <PageHeader icon="🤖" title="Agent Compare" subtitle="Know which automation agents behave differently between environments — before go-live." />
      <Card>
        <EnvPair {...{ source, target, setSource, setTarget, maps, setMaps }} mappingAllowed={s.features.includes("domain_mapping")} />
        <div className="mt-4 flex items-center gap-3">
          <Button onClick={run} disabled={busy || source === target}>{busy && <Spinner />} Compare agents</Button>
          <span className="text-xs text-slate-500">Matches agents by GID after mapping, actions by IF/ELSE block + sequence. Audit columns are ignored. Domains inside action parameters are mapped too.</span>
        </div>
        {err && <div className="mt-3"><Alert tone="red">{err}</Alert></div>}
      </Card>
      <div className="mt-4">{data ? <AgentResults data={data} /> : <Card><div className="py-10 text-center text-sm text-slate-500">Pick two environments and press <b>Compare agents</b>. Try Dev → Prod with and without the domain mapping.</div></Card>}</div>
    </div>
  );
}
export default function Page() { return <Gate feature="agent_compare"><AgentsInner /></Gate>; }
