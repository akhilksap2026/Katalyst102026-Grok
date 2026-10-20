import { handle, requireSession, ApiError } from "@/lib/api";
import { readStore } from "@/lib/store";
import { hasFeature } from "@/lib/entitlements";

export async function GET() {
  return handle(async () => {
    const s = await requireSession();
    const all = readStore().audit;
    if (s.user.superAdmin) return all.slice(0, 300);
    if (!hasFeature(s.tenant, "audit_log") || !["owner", "admin"].includes(s.role)) throw new ApiError(403, "Audit log requires Enterprise and an admin role.", "not_entitled");
    return all.filter((a) => a.tenantId === s.tenant.id).slice(0, 300);
  });
}
