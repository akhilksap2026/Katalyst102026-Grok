import { describe, it, expect } from "vitest";
import { processList, type CleanOptions } from "@/lib/listCleaner";
const base: CleanOptions = { format: "single", caseMode: "none", dedupe: true, domainActions: [] };
describe("listCleaner", () => {
  it("splits, cleans and dedupes (AC-1)", () => {
    const r = processList("['A'],\n\"B\";  C ;\tA\n\n", base);
    expect(r.items).toEqual(["A", "B", "C"]);
    expect(r.rowsIn).toBe(4);
    expect(r.uniqueOut).toBe(3);
  });
  it("formats in 5 ways (AC-2)", () => {
    const o = (format: CleanOptions["format"]) => processList("A\nB", { ...base, format }).output;
    expect(o("single")).toBe("'A','B'");
    expect(o("double")).toBe('"A","B"');
    expect(o("csv")).toBe("A,B");
    expect(o("in")).toBe("IN ('A','B')");
    expect(o("lines")).toBe("A\nB");
  });
  it("escapes single quotes (AC-8)", () => {
    expect(processList("O'NEIL", base).output).toBe("'O''NEIL'");
  });
  it("keeps inner spaces", () => {
    expect(processList("  NEW   YORK DC ", base).items).toEqual(["NEW YORK DC"]);
  });
  it("adds domain only where missing", () => {
    expect(processList("A\nX.B", { ...base, domainActions: [{ kind: "add", domain: "ksap" }] }).items).toEqual(["KSAP.A", "X.B"]);
  });
  it("replaces domain case-insensitively, never PUBLIC", () => {
    const r = processList("ksap.A\nPUBLIC.B\nOTHER.C", { ...base, domainActions: [{ kind: "replace", from: "KSAP", to: "acme" }] });
    expect(r.items).toEqual(["ACME.A", "PUBLIC.B", "OTHER.C"]);
  });
  it("re-dedupes after Remove domain", () => {
    const r = processList("KSAP.A\nPUBLIC.A\nB", { ...base, domainActions: [{ kind: "remove" }] });
    expect(r.items).toEqual(["A", "B"]);
  });
  it("re-dedupes after case conversion", () => {
    expect(processList("a\nA", { ...base, caseMode: "upper" }).items).toEqual(["A"]);
  });
  it("chunks IN lists over 1000 (AC-7)", () => {
    const input = Array.from({ length: 1001 }, (_, i) => `ID${i}`).join("\n");
    const r = processList(input, { ...base, format: "in" });
    expect(r.warning).toMatch(/1,000/);
    expect(r.output.match(/IN \(/g)!.length).toBe(2);
    expect(r.output).toContain("OR <column> IN ('ID1000')");
  });
});
