import { describe, it, expect } from "vitest";
import { effectiveFeatures, hasFeature, minimumPlan, canUseEnv, canRunQueries, type TenantLike } from "@/lib/entitlements";
const t = (plan: TenantLike["plan"], overrides: TenantLike["overrides"] = {}, status: TenantLike["status"] = "active"): TenantLike => ({ plan, overrides, status });
describe("entitlements", () => {
  it("applies plan defaults", () => {
    expect(hasFeature(t("starter"), "column_jargon")).toBe(true);
    expect(hasFeature(t("starter"), "agent_compare")).toBe(false);
    expect(hasFeature(t("pro"), "agent_compare")).toBe(true);
    expect(hasFeature(t("pro"), "config_compare")).toBe(false);
    expect(hasFeature(t("enterprise"), "playbooks")).toBe(true);
  });
  it("applies per-tenant overrides both ways", () => {
    expect(hasFeature(t("starter", { agent_compare: true }), "agent_compare")).toBe(true);
    expect(hasFeature(t("enterprise", { playbooks: false }), "playbooks")).toBe(false);
  });
  it("suspended tenants get nothing", () => {
    expect(effectiveFeatures(t("enterprise", {}, "suspended")).size).toBe(0);
  });
  it("finds the minimum plan for upgrade cards", () => {
    expect(minimumPlan("column_jargon")).toBe("starter");
    expect(minimumPlan("agent_compare")).toBe("pro");
    expect(minimumPlan("config_compare")).toBe("enterprise");
  });
  it("gates environments", () => {
    expect(canUseEnv(t("starter"), "dev").ok).toBe(true);
    expect(canUseEnv(t("starter"), "test").ok).toBe(false);
    expect(canUseEnv(t("pro"), "test").ok).toBe(true);
    expect(canUseEnv(t("pro"), "prod").ok).toBe(false);
    expect(canUseEnv(t("enterprise"), "prod").ok).toBe(true);
  });
  it("read-only role cannot run queries", () => {
    expect(canRunQueries("viewer")).toBe(false);
    expect(canRunQueries("consultant")).toBe(true);
  });
});
