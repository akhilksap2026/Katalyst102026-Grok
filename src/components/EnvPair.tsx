"use client";
import { useSession } from "./session";
import { Button } from "./ui";
import { canUseEnv } from "@/lib/entitlements";
import type { DomainMap } from "@/lib/agentDiff";

export function defaultMaps(domain: string, source: string, target: string): DomainMap[] {
  if (source === target) return [];
  if (target === "prod") return [{ from: domain, to: `${domain}_PRD` }];
  if (source === "prod") return [{ from: `${domain}_PRD`, to: domain }];
  return [];
}

export function EnvPair({ source, target, setSource, setTarget, maps, setMaps, mappingAllowed = true }: {
  source: string; target: string; setSource: (v: string) => void; setTarget: (v: string) => void; maps: DomainMap[]; setMaps: (m: DomainMap[]) => void; mappingAllowed?: boolean;
}) {
  const s = useSession();
  const opt = (id: string) => { const g = canUseEnv(s.tenant, id); const e = s.tenant.envs.find((x) => x.id === id)!; return <option key={id} value={id} disabled={!g.ok}>{e.label} ({e.domain}){!g.ok ? " 🔒" : ""}</option>; };
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div><label className="label">Source</label><select className="input w-48" value={source} onChange={(e) => { setSource(e.target.value); setMaps(defaultMaps(s.tenant.domain, e.target.value, target)); }}>{["dev", "test", "prod"].map(opt)}</select></div>
      <div className="pb-2 text-xl text-slate-400">→</div>
      <div><label className="label">Target</label><select className="input w-48" value={target} onChange={(e) => { setTarget(e.target.value); setMaps(defaultMaps(s.tenant.domain, source, e.target.value)); }}>{["dev", "test", "prod"].map(opt)}</select></div>
      <div className="min-w-[280px] flex-1">
        <label className="label">Domain mapping {!mappingAllowed && "🔒 Pro"}</label>
        <div className="flex flex-wrap items-center gap-2">
          {maps.map((m, i) => (
            <span key={i} className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1">
              <input disabled={!mappingAllowed} className="mono w-24 bg-transparent text-xs outline-none" value={m.from} onChange={(e) => setMaps(maps.map((x, j) => (j === i ? { ...x, from: e.target.value.toUpperCase() } : x)))} />→
              <input disabled={!mappingAllowed} className="mono w-24 bg-transparent text-xs outline-none" value={m.to} onChange={(e) => setMaps(maps.map((x, j) => (j === i ? { ...x, to: e.target.value.toUpperCase() } : x)))} />
              <button className="text-slate-400 hover:text-rose-600" onClick={() => setMaps(maps.filter((_, j) => j !== i))}>×</button>
            </span>
          ))}
          <Button size="sm" variant="ghost" disabled={!mappingAllowed} onClick={() => setMaps([...maps, { from: "", to: "" }])}>+ Map domain</Button>
        </div>
      </div>
    </div>
  );
}
