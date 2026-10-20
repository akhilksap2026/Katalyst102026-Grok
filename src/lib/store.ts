// JSON-file control-plane store (tenants, users, plans, audit). Never stores OTM data or secrets.
import fs from "fs";
import path from "path";
import type { Store, Tenant, AuditEntry, EnvProfile } from "./types";

const FILE = path.join(process.cwd(), "data", "store.json");

export function envProfiles(domain: string, slug: string): EnvProfile[] {
  return [
    { id: "dev", label: "Dev", url: `https://${slug}-dev.otmgtm.demo.oraclecloud.com`, clientId: `${slug}-dev-client`, otmUser: `${domain}.INTEGRATION`, domain },
    { id: "test", label: "Test", url: `https://${slug}-test.otmgtm.demo.oraclecloud.com`, clientId: `${slug}-test-client`, otmUser: `${domain}.INTEGRATION`, domain },
    { id: "prod", label: "Prod", url: `https://${slug}.otmgtm.demo.oraclecloud.com`, clientId: `${slug}-prod-client`, otmUser: `${domain}_PRD.INTEGRATION`, domain: `${domain}_PRD` },
  ];
}

export function seedStore(): Store {
  const now = new Date("2026-10-01T08:00:00Z").toISOString();
  const tenants: Tenant[] = [
    { id: "ksap", name: "KSAP Consulting", kind: "partner", plan: "enterprise", overrides: {}, status: "active", domain: "KSAP", region: "EU (Frankfurt)", createdAt: now, envs: envProfiles("KSAP", "ksap"), brandColor: "#4f6bff" },
    { id: "acme", name: "Acme Logistics", kind: "customer", partnerId: "ksap", plan: "pro", overrides: {}, status: "active", domain: "ACME", region: "US (Ashburn)", createdAt: now, envs: envProfiles("ACME", "acme"), brandColor: "#0ea5e9" },
    { id: "nordic", name: "Nordic Freight AB", kind: "customer", partnerId: "ksap", plan: "starter", overrides: {}, status: "active", domain: "NORD", region: "EU (Stockholm)", createdAt: now, envs: envProfiles("NORD", "nordic"), brandColor: "#10b981" },
  ];
  return {
    tenants,
    users: [
      { id: "u-admin", email: "admin@katalyst.demo", name: "Platform Admin", password: "demo123", superAdmin: true, memberships: [{ tenantId: "ksap", role: "owner" }] },
      { id: "u-owner", email: "owner@ksap.demo", name: "Akhil (Owner)", password: "demo123", memberships: [{ tenantId: "ksap", role: "owner" }, { tenantId: "acme", role: "admin" }, { tenantId: "nordic", role: "admin" }] },
      { id: "u-cons", email: "consultant@acme.demo", name: "Priya Consultant", password: "demo123", memberships: [{ tenantId: "acme", role: "consultant" }] },
      { id: "u-view", email: "viewer@nordic.demo", name: "Lars Viewer", password: "demo123", memberships: [{ tenantId: "nordic", role: "viewer" }] },
    ],
    audit: [{ id: "a0", at: now, actor: "system", action: "seed", detail: "Demo data seeded" }],
  };
}


export function readStore(): Store {
  // Read on every call: tiny file, and Next.js dev may load this module in several bundles.
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8")) as Store;
  } catch {
    const s = seedStore();
    writeStore(s);
    return s;
  }
}

export function writeStore(s: Store) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(s, null, 2));
}

export function resetStore() {
  writeStore(seedStore());
}

export function audit(actor: string, action: string, detail: string, tenantId?: string) {
  const s = readStore();
  const e: AuditEntry = { id: `a${Date.now()}${Math.random().toString(36).slice(2, 6)}`, at: new Date().toISOString(), actor, action, detail, tenantId };
  s.audit.unshift(e);
  s.audit = s.audit.slice(0, 500);
  writeStore(s);
}
