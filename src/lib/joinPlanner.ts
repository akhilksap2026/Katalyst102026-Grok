// Join planner: shortest FK path between picked tables, skipping hub tables.
// When two tables are linked by more than one FK the user must choose the link.
import { FOREIGN_KEYS, TABLE_MAP, AUDIT_COLS, type ForeignKey } from "./otm/dictionary";

export interface JoinStep { table: string; alias: string; via?: ForeignKey; joinTo?: string }
export interface Ambiguity { pair: string; a: string; b: string; options: ForeignKey[] }
export interface Plan {
  ok: boolean; steps: JoinStep[]; ambiguities: Ambiguity[]; error?: string; sql?: string; addedTables: string[];
}

export const pairKey = (a: string, b: string) => [a, b].sort().join("|");
export const fkId = (f: ForeignKey) => `${f.from}.${f.fromCol}->${f.to}`;

export function linksBetween(a: string, b: string, fks = FOREIGN_KEYS): ForeignKey[] {
  return fks.filter((f) => (f.from === a && f.to === b) || (f.from === b && f.to === a));
}

/** BFS from a set of tables already in the tree to target; hubs are never traversed unless picked. */
export function shortestPath(fromSet: string[], target: string, hubs: string[], fks = FOREIGN_KEYS): string[] | null {
  const blocked = new Set(hubs.filter((h) => !fromSet.includes(h) && h !== target));
  const adj: Record<string, Set<string>> = {};
  fks.forEach((f) => {
    (adj[f.from] ??= new Set()).add(f.to);
    (adj[f.to] ??= new Set()).add(f.from);
  });
  const prev: Record<string, string | null> = {};
  const queue: string[] = [];
  fromSet.forEach((t) => { prev[t] = null; queue.push(t); });
  while (queue.length) {
    const cur = queue.shift()!;
    if (cur === target) break;
    for (const n of [...(adj[cur] ?? [])].sort()) {
      if (n in prev || (blocked.has(n) && n !== target)) continue;
      prev[n] = cur; queue.push(n);
    }
  }
  if (!(target in prev)) return null;
  const path: string[] = [];
  for (let c: string | null = target; c !== null; c = prev[c]) path.unshift(c);
  return path;
}

const RESERVED = new Set(["or", "on", "in", "as", "is", "by", "to", "if", "at", "of", "and", "not", "all", "any", "set", "end", "for", "row", "uid"]);

export function makeAlias(table: string, used: Set<string>): string {
  let base = (TABLE_MAP[table]?.prefix ?? table.slice(0, 3)).toLowerCase();
  if (RESERVED.has(base)) base = `${base}x`;
  let a = base, i = 2;
  while (used.has(a)) a = `${base}${i++}`;
  used.add(a);
  return a;
}

export function planJoins(picked: string[], hubs: string[], choices: Record<string, string> = {}, fks = FOREIGN_KEYS): Plan {
  if (!picked.length) return { ok: false, steps: [], ambiguities: [], error: "Pick at least one table.", addedTables: [] };
  const used = new Set<string>();
  const steps: JoinStep[] = [{ table: picked[0], alias: makeAlias(picked[0], used) }];
  const inTree = [picked[0]];
  const ambiguities: Ambiguity[] = [];
  const addedTables: string[] = [];
  for (const target of picked.slice(1)) {
    if (inTree.includes(target)) continue;
    const path = shortestPath(inTree, target, hubs, fks);
    if (!path) return { ok: false, steps, ambiguities, addedTables, error: `No join path from ${inTree.join(", ")} to ${target} without passing through a hub table.` };
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], b = path[i];
      if (inTree.includes(b)) continue;
      const opts = linksBetween(a, b, fks);
      let via = opts[0];
      if (opts.length > 1) {
        const chosen = opts.find((o) => fkId(o) === choices[pairKey(a, b)]);
        if (!chosen) ambiguities.push({ pair: pairKey(a, b), a, b, options: opts });
        via = chosen ?? opts[0];
      }
      steps.push({ table: b, alias: makeAlias(b, used), via, joinTo: a });
      inTree.push(b);
      if (!picked.includes(b)) addedTables.push(b);
    }
  }
  const plan: Plan = { ok: ambiguities.length === 0, steps, ambiguities, addedTables };
  if (plan.ok) plan.sql = buildSql(steps);
  return plan;
}

/** Explicit, aliased column list — never SELECT * (avoids ORA-00918 on duplicate names). */
export function buildSql(steps: JoinStep[], colsPerTable = 6): string {
  const aliasOf: Record<string, string> = Object.fromEntries(steps.map((s) => [s.table, s.alias]));
  const cols: string[] = [];
  for (const s of steps) {
    const t = TABLE_MAP[s.table];
    const picked = t.columns.filter((c) => !AUDIT_COLS.includes(c.name) && c.name !== "DOMAIN_NAME").slice(0, colsPerTable);
    picked.forEach((c) => cols.push(`${s.alias}.${c.name} AS ${s.alias.toUpperCase()}_${c.name}`));
  }
  const lines = [`SELECT ${cols.join(",\n       ")}`, `FROM ${steps[0].table} ${steps[0].alias}`];
  for (const s of steps.slice(1)) {
    const f = s.via!;
    const left = `${aliasOf[f.from]}.${f.fromCol}`;
    const right = `${aliasOf[f.to]}.${f.toCol}`;
    lines.push(`JOIN ${s.table} ${s.alias} ON ${left} = ${right}`);
  }
  return lines.join("\n");
}
