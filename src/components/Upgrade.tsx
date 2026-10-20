"use client";
import Link from "next/link";
import { FEATURES, PLANS, minimumPlan, type Feature } from "@/lib/entitlements";
import { useSession } from "./session";
import { Button, useToast } from "./ui";

export function UpgradeCard({ feature }: { feature: Feature }) {
  const s = useSession();
  const toast = useToast();
  const plan = PLANS[minimumPlan(feature)];
  const suspended = s.tenant.status === "suspended";
  return (
    <div className="mx-auto mt-10 max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <div className="bg-gradient-to-br from-brand-600 to-violet-600 px-8 py-8 text-white">
        <div className="text-3xl">🔒</div>
        <h2 className="mt-3 text-xl font-semibold">{FEATURES[feature].label} {suspended ? "is unavailable" : `is part of ${plan.name}`}</h2>
        <p className="mt-1 text-sm text-white/80">{suspended ? "This workspace is suspended." : plan.tagline}</p>
      </div>
      <div className="space-y-4 p-8">
        <p className="text-sm text-slate-600">{suspended ? "Ask your Katalyst administrator to reactivate the workspace." : <>Your workspace <b>{s.tenant.name}</b> is on <b>{PLANS[s.tenant.plan].name}</b>. Upgrade to unlock this module for every consultant in the workspace.</>}</p>
        {!suspended && <ul className="grid grid-cols-2 gap-1 text-sm text-slate-600">{plan.features.slice(0, 8).map((f) => <li key={f}>✓ {FEATURES[f].label}</li>)}</ul>}
        <div className="flex gap-2">
          {!suspended && <Button onClick={() => toast({ text: `Upgrade request to ${plan.name} sent to your account manager (demo).` })}>Request {plan.name}</Button>}
          <Link href="/plans"><Button variant="secondary">Compare plans</Button></Link>
        </div>
      </div>
    </div>
  );
}

export function Gate({ feature, children }: { feature: Feature; children: React.ReactNode }) {
  const s = useSession();
  return s.features.includes(feature) ? <>{children}</> : <UpgradeCard feature={feature} />;
}
