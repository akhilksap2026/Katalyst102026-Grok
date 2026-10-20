"use client";
import { useState } from "react";
import { Button, Card, PageHeader, Alert, Spinner, api } from "@/components/ui";
import { Gate } from "@/components/Upgrade";
import { EnvPair, defaultMaps } from "@/components/EnvPair";
import { useConnections, useSession } from "@/components/session";
import { ConfigResults, type ConfigResp } from "@/components/CompareViews";
import type { DomainMap } from "@/lib/agentDiff";

const OBJECTS = [{ id: "rate_offering", label: "Rate offerings", ready: true }, { id: "itinerary", label: "Itineraries" }, { id: "location", label: "Locations" }, { id: "saved_query", label: "Saved queries & conditions" }];

function ConfigInner() {
  const s = useSession();
  const { tokens } = useConnections();
  const [source, setSource] = useState("dev");
  const [target, setTarget] = useState("prod");
  const [maps, setMaps] = useState<DomainMap[]>(defaultMaps(s.tenant.domain, "dev", "prod"));
  const [data, setData] = useState<ConfigResp | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true); setErr("");
    try { setData(await api<ConfigResp>("/api/config/compare", { source, target, tokens, maps })); } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  };
  return (
    <div>
      <PageHeader icon="⚖️" title="Config Compare" subtitle="Same / Different / Missing for configuration objects across environments." />
      <Card>
        <div className="mb-4 flex flex-wrap gap-2">{OBJECTS.map((o) => <span key={o.id} className={o.ready ? "rounded-full bg-brand-600 px-3 py-1 text-xs font-medium text-white" : "rounded-full border border-dashed border-slate-300 px-3 py-1 text-xs text-slate-400"}>{o.label}{!o.ready && " · soon"}</span>)}</div>
        <EnvPair {...{ source, target, setSource, setTarget, maps, setMaps }} />
        <div className="mt-4"><Button onClick={run} disabled={busy || source === target}>{busy && <Spinner />} Compare rate offerings</Button></div>
        {err && <div className="mt-3"><Alert tone="red">{err}</Alert></div>}
      </Card>
      <div className="mt-4">{data && <ConfigResults data={data} />}</div>
    </div>
  );
}
export default function Page() { return <Gate feature="config_compare"><ConfigInner /></Gate>; }
