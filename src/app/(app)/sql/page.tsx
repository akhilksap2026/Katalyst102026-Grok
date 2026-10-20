"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge, Button, Card, PageHeader, Alert, Modal, Spinner, api, cx, useToast } from "@/components/ui";
import { Gate } from "@/components/Upgrade";
import { useConnections, useSession } from "@/components/session";
import { guardSql } from "@/lib/sqlGuard";
import { planJoins, pairKey, fkId, type Plan } from "@/lib/joinPlanner";
import { canUseEnv } from "@/lib/entitlements";
import type { Table, ForeignKey } from "@/lib/otm/dictionary";
import { saveToCockpit } from "@/components/cockpitStore";

interface Dict { tables: Table[]; fks: ForeignKey[]; hubs: { table: string; inbound: number }[] }
interface Result { columns: string[]; rows: Record<string, unknown>[]; total: number; page: number; size: number; elapsedMs: number; warnings: string[] }
const KEYWORDS = ["SELECT", "FROM", "WHERE", "JOIN", "LEFT JOIN", "ON", "AND", "OR", "IN", "LIKE", "GROUP BY", "ORDER BY", "COUNT(*)", "DISTINCT", "AS", "IS NULL", "IS NOT NULL", "BETWEEN"];

function SqlInner() {
  const s = useSession();
  const toast = useToast();
  const { tokens, conns } = useConnections();
  const [dict, setDict] = useState<Dict | null>(null);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<string | null>("SHIPMENT");
  const [picked, setPicked] = useState<string[]>([]);
  const [hubs, setHubs] = useState<string[]>([]);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [plan, setPlan] = useState<Plan | null>(null);
  const [sql, setSql] = useState("SELECT sh.SHIPMENT_GID AS SH_SHIPMENT_GID,\n       sh.TRANSPORT_MODE_GID AS SH_MODE,\n       sh.TOTAL_ACTUAL_COST AS SH_COST\nFROM SHIPMENT sh\nWHERE sh.TOTAL_ACTUAL_COST > 2500\nORDER BY sh.TOTAL_ACTUAL_COST DESC");
  const [env, setEnv] = useState("dev");
  const [size, setSize] = useState(25);
  const [result, setResult] = useState<Result | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<number | null>(null);
  const [cursorWord, setCursorWord] = useState("");
  const ta = useRef<HTMLTextAreaElement>(null);
  const canRun = s.features.includes("sql_run") && s.role !== "viewer";

  useEffect(() => { api<Dict>("/api/dictionary").then((d) => { setDict(d); setHubs(d.hubs.map((h) => h.table)); }).catch((e) => setErr(e.message)); }, []);
  useEffect(() => { const q = new URLSearchParams(window.location.search).get("q"); if (q) setSql(q); }, []);

  const guard = useMemo(() => guardSql(sql), [sql]);
  const fksFor = (t: string) => dict?.fks.filter((f) => f.from === t || f.to === t) ?? [];
  const tables = useMemo(() => (dict?.tables ?? []).filter((t) => !search || t.name.includes(search.toUpperCase()) || t.description.toLowerCase().includes(search.toLowerCase()) || t.columns.some((c) => c.name.includes(search.toUpperCase()))), [dict, search]);
  const togglePick = (t: string) => { setPicked((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t])); setPlan(null); };

  const buildPlan = (ch = choices) => {
    const p = planJoins(picked, hubs, ch, dict!.fks);
    setPlan(p);
    if (p.ok && p.sql) { setSql(p.sql); toast({ text: `Generated a ${p.steps.length}-table query` }); }
  };

  // --- alias-aware autocomplete ---
  const aliasMap = useMemo(() => {
    const m: Record<string, string> = {};
    const re = /\b(?:FROM|JOIN)\s+([A-Z_][A-Z0-9_]*)\s+(?!ON\b|WHERE\b|JOIN\b)([a-z_][a-z0-9_]*)/gi;
    let x; while ((x = re.exec(sql))) m[x[2].toLowerCase()] = x[1].toUpperCase();
    return m;
  }, [sql]);
  const suggestions = useMemo(() => {
    if (!dict || !cursorWord) return [];
    const w = cursorWord;
    if (w.includes(".")) {
      const [al, part] = w.split(".");
      const t = dict.tables.find((x) => x.name === aliasMap[al.toLowerCase()]);
      return t ? t.columns.filter((c) => c.name.startsWith(part.toUpperCase())).slice(0, 12).map((c) => ({ text: `${al}.${c.name}`, hint: c.fk ? `→ ${c.fk}` : c.type })) : [];
    }
    if (w.length < 2) return [];
    const up = w.toUpperCase();
    return [...KEYWORDS.filter((k) => k.startsWith(up)).map((k) => ({ text: k, hint: "keyword" })), ...dict.tables.filter((t) => t.name.startsWith(up)).map((t) => ({ text: t.name, hint: "table" }))].slice(0, 10);
  }, [cursorWord, dict, aliasMap]);
  const onCursor = () => {
    const el = ta.current!; const before = sql.slice(0, el.selectionStart);
    const m = /([A-Za-z_][A-Za-z0-9_]*\.?[A-Za-z0-9_]*)$/.exec(before);
    setCursorWord(m ? m[1] : "");
  };
  const accept = (text: string) => {
    const el = ta.current!; const pos = el.selectionStart;
    const start = pos - cursorWord.length;
    const next = sql.slice(0, start) + text + sql.slice(pos);
    setSql(next); setCursorWord("");
    requestAnimationFrame(() => { el.focus(); el.selectionStart = el.selectionEnd = start + text.length; });
  };

  const run = async (page = 0, confirmed = false) => {
    if (env === "prod" && !confirmed) { setConfirm(page); return; }
    setBusy(true); setErr("");
    try {
      const r = await api<Result>("/api/otm/query", { env, token: tokens[env], sql, page, size, confirmProd: confirmed });
      setResult(r);
    } catch (e) {
      const er = e as Error & { status?: number };
      setErr(er.status === 401 && !tokens[env] ? `Not connected to ${env.toUpperCase()}. Use “Connect demo envs” at the top right or open Connections.` : er.message);
    }
    setBusy(false);
  };
  const csv = () => {
    if (!result) return;
    const esc = (v: unknown) => { const t = v === null || v === undefined ? "" : String(v); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
    const text = [result.columns.join(","), ...result.rows.map((r) => result.columns.map((c) => esc(r[c])).join(","))].join("\n");
    navigator.clipboard.writeText(text); toast({ text: `Copied ${result.rows.length} rows as CSV` });
  };
  const pages = result ? Math.max(1, Math.ceil(result.total / result.size)) : 1;

  return (
    <div>
      <PageHeader icon="🧭" title="SQL Assist" subtitle="Browse the OTM data model, let Katalyst plan the joins, and run read-only queries." />
      <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
        <Card title={`Dictionary · ${dict?.tables.length ?? "…"} tables`} className="xl:sticky xl:top-20 xl:self-start">
          <input className="input mb-3" placeholder="Search tables or columns…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="scroll-thin max-h-[60vh] space-y-1 overflow-y-auto pr-1">
            {!dict && <Spinner />}
            {tables.map((t) => (
              <div key={t.name} className={cx("rounded-lg border", open === t.name ? "border-brand-100 bg-brand-50/40" : "border-transparent")}>
                <div className="flex items-center gap-2 px-2 py-1.5">
                  <button className="flex-1 text-left" onClick={() => setOpen(open === t.name ? null : t.name)}>
                    <div className="mono font-medium">{t.name} {hubs.includes(t.name) && <Badge tone="gray">hub</Badge>}</div>
                    <div className="text-xs text-slate-500">{t.description}</div>
                  </button>
                  <button onClick={() => togglePick(t.name)} className={cx("rounded-md px-2 py-1 text-xs font-medium", picked.includes(t.name) ? "bg-brand-600 text-white" : "border border-slate-200 bg-white text-slate-600 hover:border-brand-500")}>{picked.includes(t.name) ? "✓ Picked" : "+ Pick"}</button>
                </div>
                {open === t.name && (
                  <div className="space-y-0.5 px-3 pb-2 text-xs">
                    {t.columns.map((c) => <div key={c.name} className="flex justify-between gap-2"><span className={cx("mono", t.pk.includes(c.name) && "font-bold text-brand-700")}>{t.pk.includes(c.name) ? "🔑 " : ""}{c.name}</span><span className="text-slate-400">{c.fk ? `→ ${c.fk}` : c.type}</span></div>)}
                    <div className="pt-1 text-slate-500">Referenced by {fksFor(t.name).filter((f) => f.to === t.name).length} FKs</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
        <div className="min-w-0 space-y-4">
          <Card title="1 · Pick tables, Katalyst finds the joins" actions={<Button size="sm" disabled={!picked.length || !dict} onClick={() => buildPlan()}>Plan joins</Button>}>
            <div className="flex flex-wrap gap-2">
              {picked.length === 0 && <span className="text-sm text-slate-500">Pick tables in the dictionary, e.g. SHIPMENT, LOCATION and ORDER_RELEASE.</span>}
              {picked.map((p, i) => <span key={p} className="mono inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-brand-700">{i === 0 && "★ "}{p}<button onClick={() => togglePick(p)} className="text-brand-400 hover:text-rose-600">×</button></span>)}
            </div>
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer text-slate-500">Hub tables never used as stepping stones ({hubs.length}) — computed from FK counts</summary>
              <div className="mt-2 flex flex-wrap gap-1.5">{dict?.hubs.map((h) => <button key={h.table} onClick={() => setHubs(hubs.includes(h.table) ? hubs.filter((x) => x !== h.table) : [...hubs, h.table])} className={cx("mono rounded-md border px-2 py-0.5 text-xs", hubs.includes(h.table) ? "border-slate-300 bg-slate-100" : "border-dashed border-slate-200 text-slate-400 line-through")}>{h.table} · {h.inbound}</button>)}</div>
            </details>
            {plan?.error && <div className="mt-3"><Alert tone="red">{plan.error}</Alert></div>}
            {plan && plan.ambiguities.length > 0 && (
              <div className="mt-4 space-y-3">
                {plan.ambiguities.map((a) => (
                  <div key={a.pair} className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <div className="text-sm font-medium text-amber-900">{a.a} and {a.b} are linked in {a.options.length} ways. Which one do you mean?</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {a.options.map((o) => <Button key={fkId(o)} size="sm" variant="secondary" onClick={() => { const ch = { ...choices, [pairKey(a.a, a.b)]: fkId(o) }; setChoices(ch); buildPlan(ch); }}>{o.from} → {o.to} via <b>{o.label}</b> <span className="mono text-slate-400">({o.fromCol})</span></Button>)}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {plan?.ok && (
              <div className="mt-4 text-sm text-slate-600">
                <div className="flex flex-wrap items-center gap-1.5">{plan.steps.map((st, i) => <span key={st.alias} className="flex items-center gap-1.5">{i > 0 && <span className="text-slate-400">—{st.via?.label}→</span>}<span className="mono rounded bg-slate-100 px-2 py-0.5">{st.table} <i className="text-slate-400">{st.alias}</i></span></span>)}</div>
                {plan.addedTables.length > 0 && <div className="mt-2 text-xs text-slate-500">Added to connect your tables: {plan.addedTables.join(", ")}</div>}
              </div>
            )}
          </Card>
          <Card title="2 · Query" actions={<>{guard.ok ? <Badge tone="green">✓ Read-only</Badge> : <Badge tone="red">Blocked</Badge>}<Button size="sm" variant="ghost" onClick={() => { const n = prompt("Name this query", "My query"); if (n) { saveToCockpit(n, sql, s.tenant.id); toast({ text: "Saved to Query Cockpit" }); } }}>☆ Save</Button></>}>
            <div className="relative">
              <textarea ref={ta} spellCheck={false} className="input mono h-56 resize-y leading-relaxed" value={sql}
                onChange={(e) => { setSql(e.target.value); requestAnimationFrame(onCursor); }} onClick={onCursor} onKeyUp={(e) => !["Tab", "Enter"].includes(e.key) && onCursor()}
                onKeyDown={(e) => { if (e.key === "Tab" && suggestions.length) { e.preventDefault(); accept(suggestions[0].text); } if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) run(0); }} />
              {suggestions.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1.5 text-xs"><span className="text-slate-400">Tab ↹</span>
                  {suggestions.map((x) => <button key={x.text} onClick={() => accept(x.text)} className="mono rounded-md border border-slate-200 bg-white px-2 py-0.5 hover:border-brand-500">{x.text} <span className="text-slate-400">{x.hint}</span></button>)}
                </div>
              )}
            </div>
            {guard.errors.map((e) => <div key={e} className="mt-2"><Alert tone="red">⛔ {e}</Alert></div>)}
            {guard.warnings.map((w) => <div key={w} className="mt-2"><Alert>⚠️ {w}</Alert></div>)}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <select className="input w-auto" value={env} onChange={(e) => setEnv(e.target.value)}>
                {s.tenant.envs.map((e) => { const g = canUseEnv(s.tenant, e.id); return <option key={e.id} value={e.id} disabled={!g.ok}>{e.label}{!g.ok ? " 🔒" : conns[e.id]?.ok ? " ●" : " ○"}</option>; })}
              </select>
              <select className="input w-auto" value={size} onChange={(e) => setSize(+e.target.value)}>{[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n} rows / page</option>)}</select>
              <Button disabled={!guard.ok || busy || !canRun} onClick={() => run(0)}>{busy ? <Spinner /> : "▶"} Run on {env.toUpperCase()}</Button>
              <span className="text-xs text-slate-400">Ctrl+Enter</span>
              {!canRun && <span className="text-sm text-violet-700">{s.role === "viewer" ? "Read-only role: you can build but not run queries." : "Running queries needs the Pro plan."}</span>}
            </div>
            {err && <div className="mt-3"><Alert tone="red">{err}</Alert></div>}
          </Card>
          {result && (
            <Card title={`3 · Results · ${result.total} rows · ${result.elapsedMs} ms`} actions={<Button size="sm" variant="secondary" onClick={csv}>Copy CSV</Button>}>
              {result.rows.length === 0 ? <p className="text-sm text-slate-500">No rows.</p> : (
                <div className="scroll-thin max-h-[480px] overflow-auto rounded-lg border border-slate-100">
                  <table className="min-w-full text-xs">
                    <thead className="sticky top-0 bg-slate-50"><tr>{result.columns.map((c) => <th key={c} className="mono whitespace-nowrap px-3 py-2 text-left font-semibold text-slate-600">{c}</th>)}</tr></thead>
                    <tbody>{result.rows.map((r, i) => <tr key={i} className="border-t border-slate-100 hover:bg-brand-50/30">{result.columns.map((c) => <td key={c} className="mono whitespace-nowrap px-3 py-1.5">{r[c] === null ? <span className="text-slate-300">null</span> : String(r[c])}</td>)}</tr>)}</tbody>
                  </table>
                </div>
              )}
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-slate-500">Page {result.page + 1} of {pages}</span>
                <div className="flex gap-2"><Button size="sm" variant="secondary" disabled={result.page === 0 || busy} onClick={() => run(result.page - 1, env === "prod")}>← Prev</Button><Button size="sm" variant="secondary" disabled={result.page + 1 >= pages || busy} onClick={() => run(result.page + 1, env === "prod")}>Next →</Button></div>
              </div>
            </Card>
          )}
        </div>
      </div>
      <Modal open={confirm !== null} title="Run this query on Production?" onClose={() => setConfirm(null)}>
        <p className="text-sm text-slate-600">The query is read-only, but it will run against <b>{s.tenant.envs.find((e) => e.id === "prod")?.url}</b>. Large queries can affect Prod performance.</p>
        <div className="mt-5 flex justify-end gap-2"><Button variant="secondary" onClick={() => setConfirm(null)}>Cancel</Button><Button variant="danger" onClick={() => { const p = confirm!; setConfirm(null); run(p, true); }}>Run on Prod</Button></div>
      </Modal>
    </div>
  );
}
export default function Page() { return <Gate feature="sql_assist"><SqlInner /></Gate>; }
