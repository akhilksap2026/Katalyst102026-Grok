import { NextResponse } from "next/server";
import { requireSession, ApiError, handle } from "@/lib/api";
import { readStore, audit } from "@/lib/store";
import { accessibleTenants, sessionCookie } from "@/lib/auth";

export async function POST(req: Request) {
  return handle(async () => {
    const s = await requireSession();
    const { tenantId } = await req.json();
    const u = readStore().users.find((x) => x.id === s.user.id)!;
    const t = accessibleTenants(u).find((a) => a.tenant.id === tenantId);
    if (!t) throw new ApiError(403, "You do not have access to that workspace.");
    audit(s.user.email, "switch_workspace", `Switched to ${t.tenant.name}`, t.tenant.id);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(sessionCookie(u.id, t.tenant.id));
    return res;
  });
}
