// Helpers for API routes: auth + server-side entitlement enforcement.
import { NextResponse } from "next/server";
import { getSession, type Session } from "./auth";
import { hasFeature, FEATURES, minimumPlan, PLANS, type Feature } from "./entitlements";

export class ApiError extends Error { constructor(public status: number, msg: string, public code = "error") { super(msg); } }

export async function requireSession(): Promise<Session> {
  const s = await getSession();
  if (!s) throw new ApiError(401, "Please sign in.", "unauthenticated");
  return s;
}

export async function requireFeature(f: Feature): Promise<Session> {
  const s = await requireSession();
  if (s.tenant.status !== "active") throw new ApiError(403, "This workspace is suspended. Contact your administrator.", "suspended");
  if (!hasFeature(s.tenant, f)) throw new ApiError(403, `${FEATURES[f].label} is not included in your plan. Upgrade to ${PLANS[minimumPlan(f)].name}.`, "not_entitled");
  return s;
}

export async function requireSuperAdmin(): Promise<Session> {
  const s = await requireSession();
  if (!s.user.superAdmin) throw new ApiError(403, "Super-admin only.", "forbidden");
  return s;
}

export function handle(fn: () => Promise<unknown>) {
  return fn().then(
    (data) => (data instanceof Response ? data : NextResponse.json(data)),
    (e) => e instanceof ApiError
      ? NextResponse.json({ error: e.message, code: e.code }, { status: e.status })
      : NextResponse.json({ error: (e as Error).message ?? "Unexpected error" }, { status: 500 }),
  );
}
