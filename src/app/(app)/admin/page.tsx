"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, PageHeader, Alert, Modal, Stat, api, cx, useToast } from "@/components/ui";
import { AuditTable } from "@/components/AuditTable";
import { useSession } from "@/components/session";
import { FEATURES, PLANS, type Feature, type PlanId } from "@/lib/entitlements";
import type { AuditEntry, Tenant } from "@/lib/types";

type T = Tenant & { features: Feature[]; members: number };

export default function Admin() {
  const s = useSession();
  const router = useRouter();
  const toast = useToast();
  const [tenants, setTenants] = useState<T[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [sel, setSel] = useState<string>("");
  const [create, setCreate] = useState(false);
  const [form, setForm] = useState({ name: "", domain: "", plan: "starter", kind: "customer", partnerId: "", region: "EU (Frankfurt)" });
  const [err, setErr] = useState("");
  const load = useCallback(async () => {
    const [t, a] = await Promise.all([api<T[]>("/api/admin/tenants"), api<AuditEntry[]>("/api/admin/audit")]);
    setTenants(t); setAudit(a); setSel((x) => x || t[0]?.id);
  }, []);
  useEffect(() => { if (s.user.superAdmin) load().catch((e) => setErr(e.message)); }, [load, s.user.superAdmin]);
  if (!s.user.superAdmin) return <Alert tone="red">Super-admin only.</Alert>;

  const patch = async (id: string, body: unknown, msg: string) => {
    try { await fetch(`/api/admin/tenants/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then(async (r) => { if (!r.ok) throw new Error((await r.json()).error); }); toast({ text: msg }); await load(); router.refresh(); }
    catch (e) { toast({ text: (e as Error).message, tone: "err" }); }
  };
  const t = tenants.find((x) => x.id === sel);
  return (
    <div>
      <PageHeader icon="🛡️" title="Super-admin console" subtitle="Provision workspaces, assign plans, switch features and suspend tenants."
        actions={<div className="flex gap-2"><Button variant="secondary" onClick={async () => { if (confirm("Reset ALL demo data (tenants, users, audit) to the seed?")) { await api("/api/admin/reset", {}); toast({ text: "Demo data reset" }); await load(); router.refresh(); } }}>↺ Reset demo data</Button><Button onClick={() => setCreate(true)}>+ New tenant</Button></div>} />
      {err && <Alert tone="red">{err}</Alert>}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Tenants" value={tenants.length} />
        <Stat label="Active" value={tenants.filter((x) => x.status === "active").length} tone="green" />
        <Stat label="Suspended" value={tenants.filter((x) => x.status === "suspended").length} tone="red" />
        <Stat label="Enterprise" value={tenants.filter((x) => x.plan === "enterprise").length} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <Card title="Tenants">
          <div className="space-y-1.5">{tenants.map((x) => (
            <button key={x.id} onClick={() => setSel(x.id)} className={cx("flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left", sel === x.id ? "border-brand-500 bg-brand-50/50" : "border-slate-200 hover:bg-slate-50")}>
              <span className="h-8 w-1.5 rounded-full" style={{ background: x.brandColor }} />
              <div className="flex-1"><div className="font-medium">{x.name}</div><div className="text-xs text-slate-500">{x.kind === "partner" ? "Partner" : x.partnerId ? `Client of ${tenants.find((p) => p.id === x.partnerId)?.name}` : "Direct customer"} · {x.domain} · {x.members} user(s)</div></div>
              <Badge tone="blue">{PLANS[x.plan].name}</Badge>{x.status === "suspended" && <Badge tone="red">Suspended</Badge>}
            </button>
          ))}</div>
        </Card>
        {t && (
          <Card title={t.name} actions={t.status === "active" ? <Button variant="danger" size="sm" onClick={() => patch(t.id, { status: "suspended" }, `${t.name} suspended`)}>Suspend</Button> : <Button size="sm" onClick={() => patch(t.id, { status: "active" }, `${t.name} reactivated`)}>Reactivate</Button>}>
            <div className="grid gap-4 md:grid-cols-3">
              {(["starter", "pro", "enterprise"] as PlanId[]).map((p) => (
                <button key={p} onClick={() => p !== t.plan && patch(t.id, { plan: p }, `${t.name} → ${PLANS[p].name}`)} className={cx("rounded-xl border p-3 text-left", t.plan === p ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:border-brand-500")}>
                  <div className="font-semibold">{PLANS[p].name}</div><div className="text-xs text-slate-500">{PLANS[p].features.length} features · {PLANS[p].envLimit >= 99 ? "all envs" : `${PLANS[p].envLimit} env`}</div>
                </button>
              ))}
            </div>
            <div className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">Feature toggles (override plan defaults per tenant)</div>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              {(Object.keys(FEATURES) as Feature[]).map((f) => {
                const inPlan = PLANS[t.plan].features.includes(f);
                const ov = t.overrides[f];
                const on = t.status === "active" && t.features.includes(f);
                return (
                  <div key={f} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                    <div><div className="text-sm">{FEATURES[f].label}</div><div className="text-[11px] text-slate-400">{inPlan ? "In plan" : "Not in plan"}{ov !== undefined && <> · <b className="text-violet-600">override</b> <button className="underline" onClick={() => patch(t.id, { feature: f, enabled: null }, "Reset to plan default")}>reset</button></>}</div></div>
                    <button onClick={() => patch(t.id, { feature: f, enabled: !(ov ?? inPlan) }, `${FEATURES[f].label} ${!(ov ?? inPlan) ? "on" : "off"} for ${t.name}`)} className={cx("relative h-6 w-11 rounded-full transition", (ov ?? inPlan) ? "bg-brand-600" : "bg-slate-300")}>
                      <span className={cx("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition", (ov ?? inPlan) ? "left-[22px]" : "left-0.5")} />
                    </button>
                    {!on && (ov ?? inPlan) && <span className="sr-only">inactive while suspended</span>}
                  </div>
                );
              })}
            </div>
            <div className="mt-5 grid gap-2 text-sm text-slate-600 md:grid-cols-3">
              {t.envs.map((e) => <div key={e.id} className="rounded-lg bg-slate-50 p-2"><b>{e.label}</b><div className="mono truncate text-[11px]">{e.url}</div></div>)}
            </div>
          </Card>
        )}
      </div>
      <Card className="mt-4" title="Platform audit log"><AuditTable rows={audit} /></Card>
      <Modal open={create} title="Create tenant workspace" onClose={() => setCreate(false)}>
        <div className="space-y-3">
          <div><label className="label">Company name</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Globex Freight" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="label">OTM domain</label><input className="input mono" value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value.toUpperCase() })} placeholder="GLBX" /></div>
            <div><label className="label">Plan</label><select className="input" value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}>{Object.entries(PLANS).map(([k, p]) => <option key={k} value={k}>{p.name}</option>)}</select></div>
            <div><label className="label">Type</label><select className="input" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}><option value="customer">Customer</option><option value="partner">Partner</option></select></div>
            <div><label className="label">Managed by partner</label><select className="input" value={form.partnerId} onChange={(e) => setForm({ ...form, partnerId: e.target.value })}><option value="">— none —</option>{tenants.filter((x) => x.kind === "partner").map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
          </div>
          <div><label className="label">Data region</label><select className="input" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })}>{["EU (Frankfurt)", "US (Ashburn)", "UK (London)", "India (Mumbai)"].map((r) => <option key={r}>{r}</option>)}</select></div>
          <div className="flex justify-end gap-2 pt-2"><Button variant="secondary" onClick={() => setCreate(false)}>Cancel</Button>
            <Button onClick={async () => { try { const n = await api<Tenant>("/api/admin/tenants", form); toast({ text: `Workspace ${n.name} created with Dev/Test/Prod profiles` }); setCreate(false); setForm({ ...form, name: "", domain: "" }); await load(); setSel(n.id); router.refresh(); } catch (e) { toast({ text: (e as Error).message, tone: "err" }); } }}>Create workspace</Button></div>
        </div>
      </Modal>
    </div>
  );
}
