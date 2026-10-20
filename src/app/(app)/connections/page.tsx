"use client";
import { useState } from "react";
import { useConnections, useSession } from "@/components/session";
import { Badge, Button, Card, PageHeader, Alert, Spinner, api } from "@/components/ui";
import { canUseEnv } from "@/lib/entitlements";
import type { TokenResult } from "@/lib/otm/connector";

export default function Connections() {
  const s = useSession();
  const { conns, save } = useConnections();
  const [secrets, setSecrets] = useState<Record<string, string>>({ dev: "demo-secret", test: "demo-secret", prod: "demo-secret" });
  const [busy, setBusy] = useState<string>("");
  const test = async (env: string) => {
    setBusy(env);
    const p = s.tenant.envs.find((e) => e.id === env)!;
    try {
      const t = await api<TokenResult>("/api/otm/connect", { env, secret: secrets[env] });
      save(env, { token: t.token, otmUser: t.otmUser, domain: t.domain, version: t.version, at: Date.now(), ok: true });
    } catch (e) { save(env, { token: "", otmUser: p.otmUser, domain: p.domain, version: "", at: Date.now(), ok: false, error: (e as Error).message }); }
    setBusy("");
  };
  return (
    <div>
      <PageHeader icon="🔌" title="Connections" subtitle="Dev, Test and Prod profiles for this workspace. Secrets are used once to get a token and are never saved." />
      <Alert tone="blue">Demo mode: these profiles point at Katalyst&apos;s mock OTM service. Any secret works except one containing “wrong”, which simulates a rejected login.</Alert>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {s.tenant.envs.map((e) => {
          const gate = canUseEnv(s.tenant, e.id);
          const c = conns[e.id];
          return (
            <Card key={e.id} title={<span className="flex items-center gap-2">{e.label}{e.id === "prod" && <Badge tone="red">Production</Badge>}</span>}
              actions={!gate.ok ? <Badge tone="violet">🔒 Locked</Badge> : c?.ok ? <Badge tone="green">Connected</Badge> : c ? <Badge tone="red">Failed</Badge> : <Badge>Not connected</Badge>}>
              <dl className="space-y-2 text-sm">
                <div><dt className="label">OTM URL</dt><dd className="mono truncate">{e.url}</dd></div>
                <div className="grid grid-cols-2 gap-2"><div><dt className="label">Client ID</dt><dd className="mono">{e.clientId}</dd></div><div><dt className="label">Domain</dt><dd className="mono">{e.domain}</dd></div></div>
                <div><dt className="label">Client secret (session only)</dt><dd><input type="password" disabled={!gate.ok} className="input" value={secrets[e.id] ?? ""} onChange={(x) => setSecrets({ ...secrets, [e.id]: x.target.value })} /></dd></div>
              </dl>
              {!gate.ok ? <p className="mt-3 text-sm text-violet-700">{gate.reason}</p> : (
                <div className="mt-4 flex items-center gap-2">
                  <Button onClick={() => test(e.id)} disabled={busy === e.id}>{busy === e.id ? <Spinner /> : null} Test connection</Button>
                  {c && <Button variant="ghost" size="sm" onClick={() => save(e.id, null)}>Disconnect</Button>}
                </div>
              )}
              {c?.ok && <div className="mt-3 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-900">Signed in as <b>{c.otmUser}</b> · domain <b>{c.domain}</b> · {c.version}<br />Results are limited to domains this OTM user can see.</div>}
              {c && !c.ok && <div className="mt-3"><Alert tone="red">{c.error}</Alert></div>}
              {e.id === "prod" && gate.ok && <p className="mt-3 text-xs text-slate-500">Every query against Prod asks for confirmation first.</p>}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
