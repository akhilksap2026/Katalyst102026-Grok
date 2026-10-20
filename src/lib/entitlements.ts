// Plans, features and entitlement checks (pure — shared by API routes and UI).
export const FEATURES = {
  column_jargon: { label: "Column Jargon", group: "Prepare data" },
  dictionary: { label: "Dictionary browser", group: "Query & understand" },
  sql_assist: { label: "SQL Assist (build queries)", group: "Query & understand" },
  sql_run: { label: "Run queries on OTM", group: "Query & understand" },
  query_cockpit: { label: "Query Cockpit", group: "Query & understand" },
  agent_compare: { label: "Agent Compare", group: "Compare & govern" },
  config_compare: { label: "Config Compare", group: "Compare & govern" },
  agent_studio: { label: "Agent Studio", group: "Compare & govern" },
  domain_mapping: { label: "Domain mapping", group: "Compare & govern" },
  env_health: { label: "Environment health", group: "Platform" },
  playbooks: { label: "Playbooks", group: "Guided delivery" },
  prod_access: { label: "Production environment access", group: "Platform" },
  audit_log: { label: "Tenant audit log", group: "Platform" },
} as const;
export type Feature = keyof typeof FEATURES;
export type PlanId = "starter" | "pro" | "enterprise";
export type Role = "owner" | "admin" | "consultant" | "viewer";

export const PLANS: Record<PlanId, { name: string; tagline: string; envLimit: number; seatLimit: number; features: Feature[] }> = {
  starter: { name: "Starter", tagline: "Format IDs and explore the data model", envLimit: 1, seatLimit: 3,
    features: ["column_jargon", "dictionary", "sql_assist", "query_cockpit"] },
  pro: { name: "Pro", tagline: "Live queries and agent truth across environments", envLimit: 3, seatLimit: 15,
    features: ["column_jargon", "dictionary", "sql_assist", "sql_run", "query_cockpit", "agent_compare", "domain_mapping", "env_health", "agent_studio"] },
  enterprise: { name: "Enterprise", tagline: "Full consultant OS with governance", envLimit: 99, seatLimit: 999,
    features: Object.keys(FEATURES) as Feature[] },
};

export const MODULE_FEATURE: Record<string, Feature> = {
  "/jargon": "column_jargon", "/sql": "sql_assist", "/cockpit": "query_cockpit", "/agents": "agent_compare",
  "/config": "config_compare", "/studio": "agent_studio", "/playbooks": "playbooks",
};

export interface TenantLike { plan: PlanId; overrides: Partial<Record<Feature, boolean>>; status: "active" | "suspended" }

export function effectiveFeatures(t: TenantLike): Set<Feature> {
  if (t.status !== "active") return new Set();
  const set = new Set<Feature>(PLANS[t.plan].features);
  for (const [f, on] of Object.entries(t.overrides) as [Feature, boolean][]) on ? set.add(f) : set.delete(f);
  return set;
}

export function hasFeature(t: TenantLike, f: Feature): boolean {
  return effectiveFeatures(t).has(f);
}

/** Smallest plan that includes a feature — used by upgrade cards. */
export function minimumPlan(f: Feature): PlanId {
  return (["starter", "pro", "enterprise"] as PlanId[]).find((p) => PLANS[p].features.includes(f))!;
}

export function canRunQueries(role: Role): boolean {
  return role !== "viewer";
}

export function canUseEnv(t: TenantLike, env: string): { ok: boolean; reason?: string } {
  if (t.status !== "active") return { ok: false, reason: "Workspace is suspended." };
  if (env === "prod") return hasFeature(t, "prod_access") ? { ok: true } : { ok: false, reason: "Production access is an Enterprise feature." };
  if (env === "test" && PLANS[t.plan].envLimit < 2) return { ok: false, reason: `The ${PLANS[t.plan].name} plan includes 1 environment (Dev).` };
  return env === "dev" || env === "test" ? { ok: true } : { ok: false, reason: "Unknown environment." };
}
