import { describe, it, expect } from "vitest";
import { guardSql, safeInt } from "@/lib/sqlGuard";
describe("sqlGuard", () => {
  it("allows plain SELECT and WITH", () => {
    expect(guardSql("SELECT SHIPMENT_GID FROM SHIPMENT").ok).toBe(true);
    expect(guardSql("WITH x AS (SELECT 1 AS N FROM DUAL) SELECT N FROM x").ok).toBe(true);
  });
  it.each(["DELETE FROM SHIPMENT", "UPDATE SHIPMENT SET X=1", "DROP TABLE AGENT", "BEGIN NULL; END;", "INSERT INTO A VALUES (1)", "TRUNCATE TABLE X", "MERGE INTO A USING B ON (1=1)"])("blocks %s", (q) => {
    expect(guardSql(q).ok).toBe(false);
  });
  it("blocks FOR UPDATE", () => {
    const r = guardSql("SELECT * FROM SHIPMENT FOR UPDATE");
    expect(r.ok).toBe(false);
    expect(r.errors.join()).toMatch(/FOR UPDATE/);
  });
  it("blocks DB links", () => {
    expect(guardSql("SELECT X FROM SHIPMENT@PRODLINK").ok).toBe(false);
  });
  it("blocks multiple statements and DML hidden after a SELECT", () => {
    expect(guardSql("SELECT 1 FROM DUAL; DELETE FROM X").ok).toBe(false);
  });
  it("ignores keywords inside strings and comments", () => {
    expect(guardSql("SELECT X FROM T WHERE NOTE = 'please delete me' -- drop").ok).toBe(true);
    expect(guardSql("SELECT EMAIL_ADDRESS FROM CONTACT WHERE EMAIL_ADDRESS = 'a@b.com'").ok).toBe(true);
  });
  it("warns on SELECT * and duplicate output names", () => {
    expect(guardSql("SELECT * FROM SHIPMENT").warnings.length).toBe(1);
    expect(guardSql("SELECT a.DOMAIN_NAME, b.DOMAIN_NAME FROM A a JOIN B b ON a.X=b.X").warnings.join()).toMatch(/DOMAIN_NAME/);
  });
  it("validates paging integers", () => {
    expect(safeInt("50", 1, 500, 100)).toBe(50);
    expect(safeInt("1; DROP", 0, 500, 0)).toBe(1);
    expect(safeInt("abc", 0, 500, 0)).toBe(0);
    expect(safeInt(99999, 1, 500, 100)).toBe(500);
  });
});
