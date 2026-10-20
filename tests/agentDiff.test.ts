import { describe, it, expect } from "vitest";
import { compareAgents, mapDomains, summarize, type Agent } from "@/lib/agentDiff";
const a = (gid: string, over: Partial<Agent> = {}): Agent => ({
  gid, description: "d", isActive: true, dataQueryType: "SHIPMENT",
  events: [{ seq: 1, event: "SHIPMENT - CREATED", savedCondition: gid.split(".")[0] + ".SC1" }],
  actions: [{ parent: "ROOT", seq: 1, action: "IF", params: "x" }, { parent: "IF-1", seq: 1, action: "TENDER", params: `SERVPROV=${gid.split(".")[0]}.SWIFT` }],
  ...over,
});
describe("agentDiff", () => {
  it("maps domains in GIDs and parameter text but never PUBLIC", () => {
    expect(mapDomains("SERVPROV=KSAP.SWIFT; MODE=PUBLIC.TL", [{ from: "KSAP", to: "KSAP_PRD" }])).toBe("SERVPROV=KSAP_PRD.SWIFT; MODE=PUBLIC.TL");
    expect(mapDomains("XKSAP.A", [{ from: "KSAP", to: "Z" }])).toBe("XKSAP.A");
  });
  it("is Same after domain mapping, ignoring audit columns", () => {
    const r = compareAgents([a("KSAP.A1", { updateDate: "1" })], [a("KSAP_PRD.A1", { updateDate: "2" })], [{ from: "KSAP", to: "KSAP_PRD" }]);
    expect(r[0].status).toBe("Same");
  });
  it("reports Missing both ways", () => {
    const r = compareAgents([a("D.A1")], [a("D.A2")]);
    expect(summarize(r)).toEqual({ same: 0, different: 0, missing: 2, total: 2 });
  });
  it("matches actions by parent block + sequence and lists actions first", () => {
    const t = a("D.A1", { description: "changed", actions: [{ parent: "ROOT", seq: 1, action: "IF", params: "x" }, { parent: "ELSE-1", seq: 1, action: "TENDER", params: "SERVPROV=D.SWIFT" }] });
    const r = compareAgents([a("D.A1")], [t]);
    expect(r[0].status).toBe("Different");
    expect(r[0].diffs[0].area).toBe("Action");
    const keys = r[0].diffs.filter((d) => d.area === "Action").map((d) => `${d.key}:${d.change}`);
    expect(keys).toEqual(expect.arrayContaining(["IF-1#1:removed", "ELSE-1#1:added"]));
    expect(r[0].diffs[r[0].diffs.length - 1].area).toBe("Header");
  });
  it("flags agents whose referenced saved condition differs", () => {
    const r = compareAgents([a("D.A1")], [a("D.A1")], [], new Set(["D.SC1"]));
    expect(r[0].status).toBe("Different");
    expect(r[0].diffs[0].area).toBe("Reference");
  });
});
