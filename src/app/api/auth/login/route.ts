import { NextResponse } from "next/server";
import { readStore, audit } from "@/lib/store";
import { accessibleTenants, sessionCookie } from "@/lib/auth";

export async function POST(req: Request) {
  const { email, password } = await req.json().catch(() => ({}));
  const u = readStore().users.find((x) => x.email.toLowerCase() === String(email ?? "").toLowerCase().trim());
  if (!u || u.password !== password) return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
  const acc = accessibleTenants(u);
  const first = acc.find((a) => a.tenant.status === "active") ?? acc[0];
  if (!first) return NextResponse.json({ error: "No workspace assigned." }, { status: 403 });
  audit(u.email, "login", `Signed in to ${first.tenant.name}`, first.tenant.id);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(sessionCookie(u.id, first.tenant.id));
  return res;
}
