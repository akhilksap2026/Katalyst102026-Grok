import { describe, it, expect } from "vitest";
import { planJoins, shortestPath, fkId, pairKey, linksBetween } from "@/lib/joinPlanner";
import { DEFAULT_HUBS, computeHubs } from "@/lib/otm/dictionary";
describe("joinPlanner", () => {
  it("computes hubs from FK counts", () => {
    const hubs = computeHubs().map((h) => h.table);
    expect(hubs).toContain("DOMAIN");
    expect(hubs).toContain("GL_USER");
    expect(hubs).toContain("LOCATION");
  });
  it("never routes through hubs", () => {
    const p = shortestPath(["SHIPMENT"], "ORDER_RELEASE", DEFAULT_HUBS)!;
    expect(p).not.toContain("DOMAIN");
    expect(p).not.toContain("LOCATION");
    expect(p[0]).toBe("SHIPMENT");
    expect(p[p.length - 1]).toBe("ORDER_RELEASE");
  });
  it("asks the user to choose when several FKs link two tables", () => {
    expect(linksBetween("SHIPMENT", "LOCATION").length).toBe(2);
    const plan = planJoins(["SHIPMENT", "LOCATION"], DEFAULT_HUBS);
    expect(plan.ok).toBe(false);
    expect(plan.ambiguities[0].options.length).toBe(2);
    const dest = plan.ambiguities[0].options.find((o) => o.fromCol === "DEST_LOCATION_GID")!;
    const resolved = planJoins(["SHIPMENT", "LOCATION"], DEFAULT_HUBS, { [pairKey("SHIPMENT", "LOCATION")]: fkId(dest) });
    expect(resolved.ok).toBe(true);
    expect(resolved.sql).toContain("ON sh.DEST_LOCATION_GID = loc.LOCATION_GID");
  });
  it("generates explicit aliased columns (no SELECT *)", () => {
    const plan = planJoins(["SHIPMENT", "SHIPMENT_STOP"], DEFAULT_HUBS);
    expect(plan.ok).toBe(true);
    expect(plan.sql).not.toMatch(/SELECT \*/);
    expect(plan.sql).toMatch(/sh\.SHIPMENT_GID AS SH_SHIPMENT_GID/);
    expect(plan.sql).toMatch(/JOIN SHIPMENT_STOP ss ON ss\.SHIPMENT_GID = sh\.SHIPMENT_GID/);
  });
  it("adds intermediate tables", () => {
    const plan = planJoins(["AGENT", "SAVED_QUERY"], DEFAULT_HUBS);
    expect(plan.ok).toBe(true);
    expect(plan.addedTables.length).toBeGreaterThan(0);
  });
});
