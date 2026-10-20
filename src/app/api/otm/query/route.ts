import { handle, requireFeature, ApiError } from "@/lib/api";
import { canUseEnv, canRunQueries, hasFeature } from "@/lib/entitlements";
import { guardSql, safeInt } from "@/lib/sqlGuard";
import { connectorFor, OtmError } from "@/lib/otm/connector";
import { audit } from "@/lib/store";

// Stateless proxy: guard → connector → rows. Results are never stored; only the SQL text is audited.
export async function POST(req: Request) {
  return handle(async () => {
    const s = await requireFeature("sql_assist");
    if (!hasFeature(s.tenant, "sql_run")) throw new ApiError(403, "Running queries on OTM requires the Pro plan.", "not_entitled");
    if (!canRunQueries(s.role)) throw new ApiError(403, "Your role is read-only and cannot run queries.", "forbidden");
    const b = await req.json();
    const gate = canUseEnv(s.tenant, b.env);
    if (!gate.ok) throw new ApiError(403, gate.reason!, "not_entitled");
    if (b.env === "prod" && b.confirmProd !== true) throw new ApiError(409, "Confirm before running against Production.", "confirm_prod");
    const g = guardSql(String(b.sql ?? ""));
    if (!g.ok) throw new ApiError(400, g.errors.join(" "), "guard");
    const size = safeInt(b.size, 1, 500, 50);
    const page = safeInt(b.page, 0, 100000, 0);
    const profile = s.tenant.envs.find((e) => e.id === b.env)!;
    try {
      const r = await connectorFor(s.tenant.domain).query(profile, String(b.token ?? ""), b.sql, page * size, size);
      audit(s.user.email, "query_run", `[${profile.label}] ${String(b.sql).replace(/\s+/g, " ").slice(0, 160)} → ${r.total} rows`, s.tenant.id);
      return { ...r, page, size, warnings: g.warnings };
    } catch (e) {
      if (e instanceof OtmError) throw new ApiError(e.status, e.message);
      throw e;
    }
  });
}
