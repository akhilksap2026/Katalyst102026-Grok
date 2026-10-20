import { handle, requireSession, ApiError } from "@/lib/api";
import { canUseEnv, hasFeature } from "@/lib/entitlements";
import { connectorFor, OtmError } from "@/lib/otm/connector";

export async function POST(req: Request) {
  return handle(async () => {
    const s = await requireSession();
    if (!hasFeature(s.tenant, "agent_studio") && !hasFeature(s.tenant, "agent_compare")) throw new ApiError(403, "Agent tools require the Pro plan.", "not_entitled");
    const { env, token } = await req.json();
    const gate = canUseEnv(s.tenant, env);
    if (!gate.ok) throw new ApiError(403, gate.reason!, "not_entitled");
    try { return await connectorFor(s.tenant.domain).exportAgents(s.tenant.envs.find((e) => e.id === env)!, token); }
    catch (e) { if (e instanceof OtmError) throw new ApiError(e.status, e.message); throw e; }
  });
}
