import { handle, requireFeature, ApiError } from "@/lib/api";
import { canUseEnv } from "@/lib/entitlements";
import { connectorFor, OtmError } from "@/lib/otm/connector";
import { mapDomains, type DomainMap } from "@/lib/agentDiff";
import { AUDIT_COLS } from "@/lib/otm/dictionary";

const mapValue = (v: string, maps: DomainMap[]) => maps.find((m) => m.from.toUpperCase() === v)?.to.toUpperCase() ?? mapDomains(v, maps);

// Config Compare (rate offerings). Pulls rows through the connector, compares ignoring audit columns.
export async function POST(req: Request) {
  return handle(async () => {
    const s = await requireFeature("config_compare");
    const b = await req.json();
    for (const env of [b.source, b.target]) { const g = canUseEnv(s.tenant, env); if (!g.ok) throw new ApiError(403, g.reason!, "not_entitled"); }
    const maps: DomainMap[] = b.maps ?? [];
    const c = connectorFor(s.tenant.domain);
    const prof = (id: string) => s.tenant.envs.find((e) => e.id === id)!;
    const sql = "SELECT * FROM RATE_OFFERING ORDER BY RATE_OFFERING_GID";
    try {
      const [a, z] = await Promise.all([c.query(prof(b.source), b.tokens?.[b.source], sql, 0, 500), c.query(prof(b.target), b.tokens?.[b.target], sql, 0, 500)]);
      const tgt = new Map(z.rows.map((r) => [String(r.RATE_OFFERING_GID), r]));
      const results: { gid: string; status: string; diffs: { field: string; source: unknown; target: unknown }[] }[] = [];
      for (const r of a.rows) {
        const m = Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === "string" ? mapValue(v, maps) : v]));
        const gid = String(m.RATE_OFFERING_GID);
        const t = tgt.get(gid);
        if (!t) { results.push({ gid, status: "Missing in target", diffs: [] }); continue; }
        tgt.delete(gid);
        const diffs = Object.keys(m).filter((k) => !AUDIT_COLS.includes(k) && String(m[k]) !== String(t[k])).map((k) => ({ field: k, source: m[k], target: t[k] }));
        results.push({ gid, status: diffs.length ? "Different" : "Same", diffs });
      }
      for (const gid of tgt.keys()) results.push({ gid, status: "Missing in source", diffs: [] });
      const rank: Record<string, number> = { Different: 0, "Missing in target": 1, "Missing in source": 2, Same: 3 };
      results.sort((x, y) => rank[x.status] - rank[y.status] || x.gid.localeCompare(y.gid));
      return { results, summary: { same: results.filter((r) => r.status === "Same").length, different: results.filter((r) => r.status === "Different").length, missing: results.filter((r) => r.status.startsWith("Missing")).length, total: results.length } };
    } catch (e) { if (e instanceof OtmError) throw new ApiError(e.status, e.message); throw e; }
  });
}
