"use client";
import { Badge, Card, PageHeader, cx } from "@/components/ui";
import { useSession } from "@/components/session";
import { FEATURES, PLANS, type Feature, type PlanId } from "@/lib/entitlements";

export default function Plans() {
  const s = useSession();
  const groups = [...new Set(Object.values(FEATURES).map((f) => f.group))];
  const ids: PlanId[] = ["starter", "pro", "enterprise"];
  return (
    <div>
      <PageHeader icon="💎" title="Plan & features" subtitle={`${s.tenant.name} is on ${PLANS[s.tenant.plan].name}. Features are switched on per workspace by your subscription.`} />
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {ids.map((p) => (
          <div key={p} className={cx("rounded-2xl border bg-white p-6 shadow-card", s.tenant.plan === p ? "border-brand-500 ring-2 ring-brand-100" : "border-slate-200")}>
            <div className="flex items-center justify-between"><div className="text-lg font-semibold">{PLANS[p].name}</div>{s.tenant.plan === p && <Badge tone="blue">Current plan</Badge>}</div>
            <p className="mt-1 text-sm text-slate-500">{PLANS[p].tagline}</p>
            <div className="mt-4 text-sm text-slate-600">Environments: <b>{PLANS[p].envLimit >= 99 ? "Unlimited (incl. Prod)" : PLANS[p].envLimit}</b> · Seats: <b>{PLANS[p].seatLimit >= 999 ? "Unlimited" : PLANS[p].seatLimit}</b></div>
            <div className="mt-1 text-sm text-slate-400">Price: TBD</div>
          </div>
        ))}
      </div>
      <Card title="Feature matrix">
        <table className="min-w-full text-sm">
          <thead><tr className="text-left text-xs uppercase tracking-wide text-slate-500"><th className="py-2">Feature</th>{ids.map((p) => <th key={p} className="py-2 text-center">{PLANS[p].name}</th>)}<th className="py-2 text-center">Your workspace</th></tr></thead>
          <tbody>
            {groups.map((g) => [
              <tr key={g}><td colSpan={5} className="pt-4 text-xs font-semibold uppercase tracking-wide text-brand-700">{g}</td></tr>,
              ...(Object.entries(FEATURES) as [Feature, { label: string; group: string }][]).filter(([, f]) => f.group === g).map(([k, f]) => (
                <tr key={k} className="border-t border-slate-100">
                  <td className="py-2">{f.label}</td>
                  {ids.map((p) => <td key={p} className="text-center">{PLANS[p].features.includes(k) ? "✓" : <span className="text-slate-300">—</span>}</td>)}
                  <td className="text-center">{s.features.includes(k) ? <Badge tone="green">On{s.tenant.overrides[k] === true ? " · add-on" : ""}</Badge> : <Badge>{s.tenant.overrides[k] === false ? "Off · override" : "Off"}</Badge>}</td>
                </tr>
              )),
            ])}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
