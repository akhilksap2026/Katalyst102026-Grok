import { handle, requireSuperAdmin, ApiError } from "@/lib/api";
import { readStore, writeStore, audit } from "@/lib/store";
import { FEATURES, PLANS, type Feature, type PlanId } from "@/lib/entitlements";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const me = await requireSuperAdmin();
    const { id } = await ctx.params;
    const b = await req.json();
    const s = readStore();
    const t = s.tenants.find((x) => x.id === id);
    if (!t) throw new ApiError(404, "Tenant not found.");
    const logs: [string, string][] = [];
    const log = (a: string, d: string) => logs.push([a, `${t.name}: ${d}`]);
    if (b.plan) {
      if (!PLANS[b.plan as PlanId]) throw new ApiError(400, "Unknown plan.");
      log("plan_change", `${PLANS[t.plan].name} → ${PLANS[b.plan as PlanId].name}`);
      t.plan = b.plan; t.overrides = {};
    }
    if (b.feature) {
      const f = b.feature as Feature;
      if (!FEATURES[f]) throw new ApiError(400, "Unknown feature.");
      if (b.enabled === null) delete t.overrides[f]; else t.overrides[f] = !!b.enabled;
      log("feature_toggle", `${FEATURES[f].label} ${b.enabled === null ? "reset to plan default" : b.enabled ? "enabled" : "disabled"}`);
    }
    if (b.status === "active" || b.status === "suspended") {
      t.status = b.status;
      log(b.status === "active" ? "tenant_reactivate" : "tenant_suspend", b.status === "active" ? "Reactivated" : "Suspended");
    }
    writeStore(s);
    logs.forEach(([a, d]) => audit(me.user.email, a, d, t.id));
    return t;
  });
}
