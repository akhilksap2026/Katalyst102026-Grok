// Column Jargon pipeline: split → clean → dedupe → case/domain → re-dedupe → format.
export type Format = "single" | "double" | "csv" | "in" | "lines";
export type CaseMode = "none" | "upper" | "lower";
export type DomainAction =
  | { kind: "add"; domain: string }
  | { kind: "replace"; from: string; to: string }
  | { kind: "remove" };

export interface CleanOptions {
  format: Format;
  caseMode: CaseMode;
  dedupe: boolean;
  domainActions: DomainAction[];
}

export interface CleanResult {
  items: string[];
  output: string;
  rowsIn: number;
  uniqueOut: number;
  warning?: string;
}

export const IN_LIMIT = 1000;

export function split(input: string): string[] {
  return input.split(/[\n\r,;\t]+/);
}

export function cleanToken(t: string): string {
  let s = t.trim();
  // strip wrapping brackets/quotes/semicolons repeatedly from both ends
  s = s.replace(/^[\s\[\](){}'"`;]+/, "").replace(/[\s\[\](){}'"`;]+$/, "");
  return s.replace(/\s+/g, " ").trim();
}

export function dedupe(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const i of items) if (!seen.has(i)) { seen.add(i); out.push(i); }
  return out;
}

function domainOf(id: string): string | null {
  const i = id.indexOf(".");
  return i > 0 ? id.slice(0, i) : null;
}

export function applyDomain(items: string[], a: DomainAction): string[] {
  if (a.kind === "add") {
    const d = a.domain.trim().toUpperCase();
    if (!d) return items;
    return items.map((x) => (x.includes(".") ? x : `${d}.${x}`));
  }
  if (a.kind === "replace") {
    const from = a.from.trim().toUpperCase();
    const to = a.to.trim().toUpperCase();
    if (!from || !to) return items;
    return items.map((x) => {
      const d = domainOf(x);
      if (!d || d.toUpperCase() === "PUBLIC" || d.toUpperCase() !== from) return x;
      return `${to}.${x.slice(d.length + 1)}`;
    });
  }
  return items.map((x) => (x.includes(".") ? x.slice(x.indexOf(".") + 1) : x));
}

function q(s: string, ch: string) {
  return ch === "'" ? `'${s.replace(/'/g, "''")}'` : `"${s}"`;
}

export function format(items: string[], f: Format): { output: string; warning?: string } {
  switch (f) {
    case "single": return { output: items.map((i) => q(i, "'")).join(",") };
    case "double": return { output: items.map((i) => q(i, '"')).join(",") };
    case "csv": return { output: items.join(",") };
    case "lines": return { output: items.join("\n") };
    case "in": {
      if (items.length <= IN_LIMIT) return { output: `IN (${items.map((i) => q(i, "'")).join(",")})` };
      const chunks: string[] = [];
      for (let i = 0; i < items.length; i += IN_LIMIT)
        chunks.push(`IN (${items.slice(i, i + IN_LIMIT).map((x) => q(x, "'")).join(",")})`);
      return {
        output: chunks.join("\nOR <column> "),
        warning: `${items.length} values exceed Oracle's 1,000-item IN limit (ORA-01795). Split into ${chunks.length} chunks — replace <column> with your column name.`,
      };
    }
  }
}

export function processList(input: string, opts: CleanOptions): CleanResult {
  const raw = split(input).map(cleanToken).filter(Boolean);
  let items = raw;
  const caseFn = (s: string) => (opts.caseMode === "upper" ? s.toUpperCase() : opts.caseMode === "lower" ? s.toLowerCase() : s);
  items = items.map(caseFn);
  if (opts.dedupe) items = dedupe(items);
  for (const a of opts.domainActions) items = applyDomain(items, a);
  // Re-apply case after domain actions (domain names are written uppercase) and re-dedupe:
  // e.g. KSAP.A and PUBLIC.A both become A after Remove domain.
  if (opts.caseMode !== "none") items = items.map(caseFn);
  if (opts.dedupe) items = dedupe(items);
  const f = format(items, opts.format);
  return { items, output: f.output, warning: f.warning, rowsIn: raw.length, uniqueOut: items.length };
}
