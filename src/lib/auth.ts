// Demo session: HMAC-signed cookie with user id + active tenant. Server-only.
import crypto from "crypto";
import { cookies } from "next/headers";
import { readStore } from "./store";
import { effectiveFeatures, type Feature, type Role } from "./entitlements";
import type { Tenant, User } from "./types";

const SECRET = process.env.KATALYST_SESSION_SECRET ?? "katalyst-demo-secret-change-me";
export const COOKIE = "katalyst_session";

export function sign(v: string) {
  const mac = crypto.createHmac("sha256", SECRET).update(v).digest("base64url");
  return `${Buffer.from(v).toString("base64url")}.${mac}`;
}
export function unsign(token?: string): string | null {
  if (!token) return null;
  const [b, mac] = token.split(".");
  if (!b || !mac) return null;
  const v = Buffer.from(b, "base64url").toString();
  const expect = crypto.createHmac("sha256", SECRET).update(v).digest("base64url");
  return mac.length === expect.length && crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expect)) ? v : null;
}

export interface Session {
  user: Omit<User, "password">; tenant: Tenant; role: Role; features: Feature[]; tenants: { id: string; name: string; kind: string; plan: string; status: string }[];
}

/** Tenants a user can enter: direct memberships, plus partner children for partner owners/admins; super-admins see all. */
export function accessibleTenants(u: User): { tenant: Tenant; role: Role }[] {
  const s = readStore();
  const out = new Map<string, { tenant: Tenant; role: Role }>();
  for (const m of u.memberships) {
    const t = s.tenants.find((x) => x.id === m.tenantId);
    if (!t) continue;
    out.set(t.id, { tenant: t, role: m.role });
    if (t.kind === "partner" && (m.role === "owner" || m.role === "admin"))
      s.tenants.filter((c) => c.partnerId === t.id).forEach((c) => !out.has(c.id) && out.set(c.id, { tenant: c, role: "admin" }));
  }
  if (u.superAdmin) s.tenants.forEach((t) => !out.has(t.id) && out.set(t.id, { tenant: t, role: "owner" }));
  return [...out.values()];
}

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const raw = unsign(jar.get(COOKIE)?.value);
  if (!raw) return null;
  const [userId, tenantId] = raw.split("|");
  const s = readStore();
  const u = s.users.find((x) => x.id === userId);
  if (!u) return null;
  const acc = accessibleTenants(u);
  const cur = acc.find((a) => a.tenant.id === tenantId) ?? acc[0];
  if (!cur) return null;
  const { password: _p, ...user } = u;
  return {
    user, tenant: cur.tenant, role: cur.role, features: [...effectiveFeatures(cur.tenant)],
    tenants: acc.map((a) => ({ id: a.tenant.id, name: a.tenant.name, kind: a.tenant.kind, plan: a.tenant.plan, status: a.tenant.status })),
  };
}

export function sessionCookie(userId: string, tenantId: string) {
  return { name: COOKIE, value: sign(`${userId}|${tenantId}`), httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 12 };
}
