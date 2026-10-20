"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, Card, PageHeader, Empty } from "@/components/ui";
import { Gate } from "@/components/Upgrade";
import { useSession } from "@/components/session";
import { loadQueries, storeQueries, type SavedQuery } from "@/components/cockpitStore";

const TEMPLATES = [
  { name: "Shipments with stops and locations", sql: "SELECT sh.SHIPMENT_GID AS SH_SHIPMENT_GID,\n       ss.STOP_NUM AS SS_STOP_NUM,\n       ss.STOP_TYPE AS SS_STOP_TYPE,\n       loc.LOCATION_NAME AS LOC_NAME,\n       loc.CITY AS LOC_CITY\nFROM SHIPMENT sh\nJOIN SHIPMENT_STOP ss ON ss.SHIPMENT_GID = sh.SHIPMENT_GID\nJOIN LOCATION loc ON ss.LOCATION_GID = loc.LOCATION_GID\nORDER BY sh.SHIPMENT_GID, ss.STOP_NUM" },
  { name: "Shipment ↔ order release", sql: "SELECT sh.SHIPMENT_GID AS SH_SHIPMENT_GID,\n       ssu.ORDER_RELEASE_GID AS SSU_ORDER_RELEASE_GID,\n       ord.STATUS AS OR_STATUS,\n       ord.TOTAL_WEIGHT AS OR_WEIGHT\nFROM SHIPMENT sh\nJOIN S_SHIP_UNIT ssu ON ssu.SHIPMENT_GID = sh.SHIPMENT_GID\nJOIN ORDER_RELEASE ord ON ssu.ORDER_RELEASE_GID = ord.ORDER_RELEASE_GID" },
  { name: "Cost by carrier", sql: "SELECT sh.SERVPROV_GID AS CARRIER,\n       COUNT(*) AS SHIPMENTS,\n       SUM(sh.TOTAL_ACTUAL_COST) AS TOTAL_COST\nFROM SHIPMENT sh\nGROUP BY sh.SERVPROV_GID\nORDER BY TOTAL_COST DESC" },
  { name: "Agents and their actions", sql: "SELECT ag.AGENT_GID AS AG_AGENT_GID,\n       aad.PARENT_BLOCK AS AAD_BLOCK,\n       aad.ACTION_SEQUENCE AS AAD_SEQ,\n       aad.AGENT_ACTION_GID AS AAD_ACTION,\n       aad.ACTION_PARAMETERS AS AAD_PARAMS\nFROM AGENT ag\nJOIN AGENT_ACTION_DETAILS aad ON aad.AGENT_GID = ag.AGENT_GID\nORDER BY ag.AGENT_GID, aad.PARENT_BLOCK, aad.ACTION_SEQUENCE" },
];

function CockpitInner() {
  const s = useSession();
  const [list, setList] = useState<SavedQuery[]>([]);
  const [q, setQ] = useState("");
  useEffect(() => setList(loadQueries(s.tenant.id)), [s.tenant.id]);
  const del = (id: number) => { const n = list.filter((x) => x.id !== id); setList(n); storeQueries(s.tenant.id, n); };
  const shown = list.filter((x) => !q || (x.name + x.sql).toLowerCase().includes(q.toLowerCase()));
  const open = (sql: string) => `/sql?q=${encodeURIComponent(sql)}`;
  return (
    <div>
      <PageHeader icon="📚" title="Query Cockpit" subtitle="Your personal query library (stored only in this browser) plus join templates." />
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <Card title={`My saved queries (${list.length})`} actions={<input className="input w-56" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />}>
          {shown.length === 0 ? <Empty icon="☆" title="No saved queries yet">In SQL Assist press <b>☆ Save</b> to keep a query here. Queries never leave your browser.</Empty> : (
            <div className="space-y-3">{shown.map((x) => (
              <div key={x.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-center justify-between"><div className="font-medium">{x.name}</div><div className="flex gap-1"><Link href={open(x.sql)}><Button size="sm">Open</Button></Link><Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(x.sql)}>Copy</Button><Button size="sm" variant="ghost" onClick={() => del(x.id)}>Delete</Button></div></div>
                <pre className="mono mt-2 max-h-28 overflow-auto rounded-lg bg-slate-50 p-2 text-slate-600">{x.sql}</pre>
                <div className="mt-1 text-xs text-slate-400">Saved {new Date(x.savedAt).toLocaleString()}</div>
              </div>
            ))}</div>
          )}
        </Card>
        <Card title="Join templates">
          <div className="space-y-2">{TEMPLATES.map((t) => (
            <div key={t.name} className="rounded-xl border border-slate-200 p-3">
              <div className="text-sm font-medium">{t.name}</div>
              <div className="mt-2 flex gap-1"><Link href={open(t.sql)}><Button size="sm" variant="secondary">Open in SQL Assist</Button></Link><Button size="sm" variant="ghost" onClick={() => { const n = [{ id: Date.now(), name: t.name, sql: t.sql, savedAt: new Date().toISOString(), tags: ["template"] }, ...list]; setList(n); storeQueries(s.tenant.id, n); }}>☆ Save</Button></div>
            </div>
          ))}</div>
        </Card>
      </div>
    </div>
  );
}
export default function Page() { return <Gate feature="query_cockpit"><CockpitInner /></Gate>; }
