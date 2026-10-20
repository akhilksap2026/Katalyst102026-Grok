// Agent Compare engine. Matches agents by GID after domain mapping, actions by (parent block, sequence).
export interface AgentEvent { seq: number; event: string; savedCondition?: string }
export interface AgentAction { parent: string; seq: number; action: string; params: string; notify?: string }
export interface Agent {
  gid: string; description: string; isActive: boolean; dataQueryType: string; restriction?: string;
  events: AgentEvent[]; actions: AgentAction[];
  insertDate?: string; updateDate?: string; updateUser?: string;
}
export interface DomainMap { from: string; to: string }
export type Status = "Same" | "Different" | "Missing in target" | "Missing in source";
export interface FieldDiff { area: "Action" | "Event" | "Header" | "Reference"; key: string; source?: string; target?: string; change: "added" | "removed" | "changed" }
export interface AgentResult { gid: string; status: Status; reason: string; diffs: FieldDiff[]; source?: Agent; target?: Agent }

/** Rewrite domain prefixes in a GID or inside free text (e.g. ACTION_PARAMETERS). PUBLIC is never mapped. */
export function mapDomains(text: string, maps: DomainMap[]): string {
  let out = text;
  for (const m of maps) {
    const from = m.from.trim().toUpperCase(), to = m.to.trim().toUpperCase();
    if (!from || !to || from === "PUBLIC") continue;
    out = out.replace(new RegExp(`(^|[^A-Z0-9_])${from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.`, "g"), `$1${to}.`);
  }
  return out;
}

export function normalizeAgent(a: Agent, maps: DomainMap[]): Agent {
  const m = (s?: string) => (s === undefined ? s : mapDomains(s, maps));
  return {
    ...a, gid: m(a.gid)!, restriction: m(a.restriction),
    events: a.events.map((e) => ({ ...e, savedCondition: m(e.savedCondition) })),
    actions: a.actions.map((x) => ({ ...x, params: m(x.params)!, notify: m(x.notify) })),
  };
}

export function diffAgent(src: Agent, tgt: Agent, condDiffs: Set<string> = new Set()): FieldDiff[] {
  const diffs: FieldDiff[] = [];
  const key = (a: AgentAction) => `${a.parent}#${a.seq}`;
  const sa = new Map(src.actions.map((a) => [key(a), a]));
  const ta = new Map(tgt.actions.map((a) => [key(a), a]));
  const fmt = (a: AgentAction) => `${a.action}(${a.params})${a.notify ? " → " + a.notify : ""}`;
  for (const [k, a] of sa) {
    const b = ta.get(k);
    if (!b) diffs.push({ area: "Action", key: k, source: fmt(a), change: "removed" });
    else if (fmt(a) !== fmt(b)) diffs.push({ area: "Action", key: k, source: fmt(a), target: fmt(b), change: "changed" });
  }
  for (const [k, b] of ta) if (!sa.has(k)) diffs.push({ area: "Action", key: k, target: fmt(b), change: "added" });
  const ev = (e: AgentEvent) => `${e.event}${e.savedCondition ? " if " + e.savedCondition : ""}`;
  const se = new Map(src.events.map((e) => [e.seq, e]));
  const te = new Map(tgt.events.map((e) => [e.seq, e]));
  for (const [k, e] of se) {
    const f = te.get(k);
    if (!f) diffs.push({ area: "Event", key: `Event ${k}`, source: ev(e), change: "removed" });
    else if (ev(e) !== ev(f)) diffs.push({ area: "Event", key: `Event ${k}`, source: ev(e), target: ev(f), change: "changed" });
  }
  for (const [k, f] of te) if (!se.has(k)) diffs.push({ area: "Event", key: `Event ${k}`, target: ev(f), change: "added" });
  // Audit columns (insert/update user/date) are intentionally ignored.
  const hdr: [string, string, string][] = [
    ["Description", src.description, tgt.description],
    ["Active", String(src.isActive), String(tgt.isActive)],
    ["Data query type", src.dataQueryType, tgt.dataQueryType],
    ["Restriction", src.restriction ?? "", tgt.restriction ?? ""],
  ];
  hdr.forEach(([k, s, t]) => s !== t && diffs.push({ area: "Header", key: k, source: s, target: t, change: "changed" }));
  // Referenced saved conditions whose definition differs between environments
  src.events.forEach((e) => {
    if (e.savedCondition && condDiffs.has(e.savedCondition))
      diffs.push({ area: "Reference", key: e.savedCondition, source: "definition A", target: "definition B", change: "changed" });
  });
  const order = { Action: 0, Event: 1, Reference: 2, Header: 3 };
  return diffs.sort((a, b) => order[a.area] - order[b.area]);
}

export function compareAgents(source: Agent[], target: Agent[], maps: DomainMap[] = [], condDiffs: Set<string> = new Set()): AgentResult[] {
  const src = source.map((a) => normalizeAgent(a, maps));
  const tgt = new Map(target.map((a) => [a.gid, a]));
  const results: AgentResult[] = [];
  for (const s of src) {
    const t = tgt.get(s.gid);
    if (!t) { results.push({ gid: s.gid, status: "Missing in target", reason: "Agent does not exist in target", diffs: [], source: s }); continue; }
    tgt.delete(s.gid);
    const diffs = diffAgent(s, t, condDiffs);
    const first = diffs[0];
    results.push({
      gid: s.gid, status: diffs.length ? "Different" : "Same", diffs, source: s, target: t,
      reason: diffs.length ? `${diffs.length} difference${diffs.length > 1 ? "s" : ""} — first: ${first.area} ${first.key} ${first.change}` : "Behaves the same",
    });
  }
  for (const t of tgt.values()) results.push({ gid: t.gid, status: "Missing in source", reason: "Only exists in target", diffs: [], target: t });
  const rank = { Different: 0, "Missing in target": 1, "Missing in source": 2, Same: 3 };
  return results.sort((a, b) => rank[a.status] - rank[b.status] || a.gid.localeCompare(b.gid));
}

export function summarize(r: AgentResult[]) {
  return {
    same: r.filter((x) => x.status === "Same").length,
    different: r.filter((x) => x.status === "Different").length,
    missing: r.filter((x) => x.status.startsWith("Missing")).length,
    total: r.length,
  };
}
