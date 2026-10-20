import { handle, requireSuperAdmin, ApiError } from "@/lib/api";
import { readStore, writeStore, audit, envProfiles } from "@/lib/store";
import { effectiveFeatures, PLANS, type PlanId } from "@/lib/entitlements";
import type { Tenant } from "@/lib/types";

export async function GET() {
  return handle(async () => {
    await requireSuperAdmin();
    const s = readStore();
    return s.tenants.map((t) => ({ ...t, features: [...effectiveFeatures(t)], members: s.users.filter((u) => u.memberships.some((m) => m.tenantId === t.id)).length }));
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const me = await requireSuperAdmin();
    const b = await req.json();
    const name = String(b.name ?? "").trim();
    const domain = String(b.domain ?? "").trim().toUpperCase().replace(/[^A-Z0-9_]/g, "");
    const plan = (b.plan ?? "starter") as PlanId;
    if (!name || !domain) throw new ApiError(400, "Name and OTM domain are required.");
    if (!PLANS[plan]) throw new ApiError(400, "Unknown plan.");
    const s = readStore();
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || `t${Date.now()}`;
    if (s.tenants.some((t) => t.id === id)) throw new ApiError(409, "A workspace with that name already exists.");
    const t: Tenant = { id, name, kind: b.kind === "partner" ? "partner" : "customer", partnerId: b.partnerId || undefined, plan, overrides: {}, status: "active", domain, region: b.region || "EU (Frankfurt)", createdAt: new Date().toISOString(), envs: envProfiles(domain, id), brandColor: "#6366f1" };
    s.tenants.push(t);
    writeStore(s);
    audit(me.user.email, "tenant_create", `Created ${name} (${PLANS[plan].name}, domain ${domain})`, id);
    return t;
  });
}
