import { handle, requireFeature, ApiError } from "@/lib/api";
import { canUseEnv, hasFeature } from "@/lib/entitlements";
import { connectorFor, OtmError } from "@/lib/otm/connector";
import { compareAgents, mapDomains, summarize, type DomainMap } from "@/lib/agentDiff";
import { audit } from "@/lib/store";

export async function POST(req: Request) {
  return handle(async () => {
    const s = await requireFeature("agent_compare");
    const b = await req.json();
    for (const env of [b.source, b.target]) { const g = canUseEnv(s.tenant, env); if (!g.ok) throw new ApiError(403, g.reason!, "not_entitled"); }
    const maps: DomainMap[] = hasFeature(s.tenant, "domain_mapping") ? (b.maps ?? []) : [];
    const c = connectorFor(s.tenant.domain);
    const prof = (id: string) => s.tenant.envs.find((e) => e.id === id)!;
    try {
      const [src, tgt] = await Promise.all([c.exportAgents(prof(b.source), b.tokens?.[b.source]), c.exportAgents(prof(b.target), b.tokens?.[b.target])]);
      const condDiffs = new Set<string>();
      for (const [gid, sql] of Object.entries(src.conditions)) {
        const mg = mapDomains(gid, maps);
        if (tgt.conditions[mg] !== undefined && tgt.conditions[mg] !== sql) condDiffs.add(mg);
      }
      const results = compareAgents(src.agents, tgt.agents, maps, condDiffs);
      audit(s.user.email, "agent_compare", `${prof(b.source).label} → ${prof(b.target).label}: ${JSON.stringify(summarize(results))}`, s.tenant.id);
      return { results, summary: summarize(results), source: prof(b.source), target: prof(b.target), condDiffs: [...condDiffs] };
    } catch (e) { if (e instanceof OtmError) throw new ApiError(e.status, e.message); throw e; }
  });
}
