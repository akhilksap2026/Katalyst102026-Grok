// Read-only guard for SQL sent to OTM. Blocks DML/DDL/PLSQL, row locks and DB links.
export interface GuardResult { ok: boolean; errors: string[]; warnings: string[] }

const BLOCKED = ["INSERT", "UPDATE", "DELETE", "MERGE", "DROP", "ALTER", "CREATE", "TRUNCATE", "GRANT", "REVOKE",
  "EXECUTE", "EXEC", "BEGIN", "DECLARE", "CALL", "COMMIT", "ROLLBACK", "SAVEPOINT", "LOCK", "RENAME", "COMMENT", "PURGE", "FLASHBACK"];

/** Remove comments and string literal contents so keywords inside them are ignored. */
export function stripLiterals(sql: string): string {
  return sql
    .replace(/--[^\n]*/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/'(?:[^']|'')*'/g, "''")
    .replace(/"[^"]*"/g, (m) => m.replace(/@/g, "_"));
}

export function guardSql(sql: string): GuardResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const s = stripLiterals(sql).trim().replace(/;\s*$/, "");
  if (!s) return { ok: false, errors: ["Query is empty."], warnings };
  if (s.includes(";")) errors.push("Only one statement is allowed.");
  if (!/^(SELECT|WITH)\b/i.test(s)) errors.push("Only SELECT (or WITH … SELECT) queries are allowed.");
  const upper = s.toUpperCase();
  const kw = upper.replace(/\bFOR\s+UPDATE\b/g, "FOR_UPD");
  for (const k of BLOCKED) if (new RegExp(`\\b${k}\\b`).test(kw)) errors.push(`Blocked keyword: ${k}. Katalyst is read-only.`);
  if (/\bFOR\s+UPDATE\b/.test(upper)) errors.push("SELECT … FOR UPDATE locks rows and is blocked.");
  if (/@\s*[A-Z_]/i.test(s)) errors.push("Database links (@dblink) are blocked.");
  if (/SELECT\s+\*/i.test(s)) warnings.push("SELECT * over joins can produce duplicate column names (ORA-00918). Prefer explicit aliased columns.");
  const dup = duplicateAliases(s);
  if (dup.length) warnings.push(`Duplicate output column names: ${dup.join(", ")}. Add aliases.`);
  return { ok: errors.length === 0, errors: Array.from(new Set(errors)), warnings };
}

function duplicateAliases(s: string): string[] {
  const m = /^\s*SELECT\s+([\s\S]*?)\s+FROM\s/i.exec(s);
  if (!m || m[1].includes("(")) return [];
  const names = m[1].split(",").map((c) => {
    const p = c.trim().split(/\s+/);
    const last = p[p.length - 1];
    return last.split(".").pop()!.toUpperCase();
  });
  const seen = new Set<string>(); const d = new Set<string>();
  names.forEach((n) => (n !== "*" && seen.has(n) ? d.add(n) : seen.add(n)));
  return [...d];
}

/** Validate paging values: DBXML xmlExport has no bind variables, so they are inlined as integers. */
export function safeInt(v: unknown, min: number, max: number, def: number): number {
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  if (!Number.isInteger(n) || n < min) return def;
  return Math.min(n, max);
}
