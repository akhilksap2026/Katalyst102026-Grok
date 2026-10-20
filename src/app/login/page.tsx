"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const DEMO = [
  { email: "admin@katalyst.demo", role: "Super-admin", desc: "Platform console: tenants, plans, features, audit" },
  { email: "owner@ksap.demo", role: "Partner owner", desc: "KSAP (Enterprise) + manages Acme & Nordic" },
  { email: "consultant@acme.demo", role: "Consultant", desc: "Acme Logistics · Pro plan" },
  { email: "viewer@nordic.demo", role: "Read-only", desc: "Nordic Freight · Starter plan" },
];

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("owner@ksap.demo");
  const [password, setPassword] = useState("demo123");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const go = async (e?: string) => {
    setBusy(true); setErr("");
    const res = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: e ?? email, password: e ? "demo123" : password }) });
    if (res.ok) { sessionStorage.clear(); router.push("/"); router.refresh(); } else { setErr((await res.json()).error); setBusy(false); }
  };
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-gradient-to-br from-[#1b2560] via-brand-700 to-violet-700 p-12 text-white lg:flex">
        <div className="flex items-center gap-2 text-lg font-semibold"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15">K</span>Katalyst</div>
        <div>
          <h1 className="text-4xl font-semibold leading-tight">The OTM Consultant OS.</h1>
          <p className="mt-4 max-w-md text-white/75">Format IDs, build safe queries, and know exactly how Dev, Test and Prod differ — agents, rates and config — before go-live.</p>
          <div className="mt-8 grid max-w-md grid-cols-3 gap-3 text-sm">
            {["Read-only by design", "Secrets never stored", "Workspace per customer"].map((t) => <div key={t} className="rounded-xl bg-white/10 p-3">{t}</div>)}
          </div>
        </div>
        <div className="text-xs text-white/50">Demo prototype · mock OTM data · no real customer data</div>
      </div>
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-semibold">Sign in</h2>
          <p className="mt-1 text-sm text-slate-500">Use a demo account — all passwords are <code className="mono">demo123</code>.</p>
          <form className="mt-6 space-y-3" onSubmit={(e) => { e.preventDefault(); go(); }}>
            <div><label className="label">Email</label><input className="input" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div><label className="label">Password</label><input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            {err && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</div>}
            <button disabled={busy} className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">{busy ? "Signing in…" : "Sign in"}</button>
          </form>
          <div className="mt-8 text-xs font-semibold uppercase tracking-wide text-slate-400">Quick demo logins</div>
          <div className="mt-2 space-y-2">
            {DEMO.map((d) => (
              <button key={d.email} onClick={() => go(d.email)} className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left hover:border-brand-500 hover:bg-brand-50/40">
                <div><div className="text-sm font-medium">{d.role}</div><div className="text-xs text-slate-500">{d.desc}</div></div>
                <span className="mono text-slate-400">{d.email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
