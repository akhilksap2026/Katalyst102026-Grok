import { handle, requireSession, ApiError } from "@/lib/api";
import { canUseEnv } from "@/lib/entitlements";
import { connectorFor, OtmError } from "@/lib/otm/connector";
import { audit } from "@/lib/store";

// Exchanges the client secret for a short-lived token. The secret is used once and never stored.
export async function POST(req: Request) {
  return handle(async () => {
    const s = await requireSession();
    const { env, secret } = await req.json();
    const gate = canUseEnv(s.tenant, env);
    if (!gate.ok) throw new ApiError(403, gate.reason!, "not_entitled");
    const profile = s.tenant.envs.find((e) => e.id === env);
    if (!profile) throw new ApiError(404, "Unknown environment.");
    try {
      const t = await connectorFor(s.tenant.domain).getToken(profile, String(secret ?? ""));
      audit(s.user.email, "otm_connect", `Connected to ${profile.label} as ${t.otmUser}`, s.tenant.id);
      return t;
    } catch (e) {
      if (e instanceof OtmError) throw new ApiError(e.status, e.message);
      throw e;
    }
  });
}
