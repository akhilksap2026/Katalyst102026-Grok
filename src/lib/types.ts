import type { Feature, PlanId, Role } from "./entitlements";
export interface EnvProfile { id: "dev" | "test" | "prod"; label: string; url: string; clientId: string; otmUser: string; domain: string }
export interface Tenant {
  id: string; name: string; kind: "customer" | "partner"; partnerId?: string; plan: PlanId;
  overrides: Partial<Record<Feature, boolean>>; status: "active" | "suspended"; domain: string;
  region: string; createdAt: string; envs: EnvProfile[]; brandColor: string;
}
export interface Membership { tenantId: string; role: Role }
export interface User { id: string; email: string; name: string; password: string; superAdmin?: boolean; memberships: Membership[] }
export interface AuditEntry { id: string; at: string; actor: string; tenantId?: string; action: string; detail: string }
export interface Store { tenants: Tenant[]; users: User[]; audit: AuditEntry[] }
