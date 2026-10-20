"use client";
import { useState } from "react";
import { Badge, Button, Card, Stat, cx, statusTone } from "./ui";
import type { AgentResult } from "@/lib/agentDiff";

export interface Resp { results: AgentResult[]; summary: { same: number; different: number; missing: number; total: number }; condDiffs: string[] }

export function AgentResults({ data }: { data: Resp }) {
  const [filter, setFilter] = useState("all");
  const [openGid, setOpenGid] = useState<string | null>(data.results.find((r) => r.status === "Different")?.gid ?? null);
  const rows = data.results.filter((r) => filter === "all" || (filter === "Missing" ? r.status.startsWith("Missing") : r.status === filter));
  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Agents compared" value={data.summary.total} />
        <Stat label="Same" value={data.summary.same} tone="green" />
        <Stat label="Different" value={data.summary.different} tone="amber" />
        <Stat label="Missing" value={data.summary.missing} tone="red" />
      </div>
      <Card className="mt-4" title="Agents" actions={<div className="flex gap-1">{["all", "Different", "Missing", "Same"].map((f) => <Button key={f} size="sm" variant={filter === f ? "primary" : "ghost"} onClick={() => setFilter(f)}>{f === "all" ? "All" : f}</Button>)}</div>}>
        <div className="divide-y divide-slate-100">
          {rows.map((r) => (
            <div key={r.gid}>
              <button onClick={() => setOpenGid(openGid === r.gid ? null : r.gid)} className="flex w-full items-center gap-3 py-3 text-left hover:bg-slate-50/60">
                <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                <span className="mono font-medium">{r.gid}</span>
                <span className="flex-1 truncate text-sm text-slate-500">{(r.source ?? r.target)?.description}</span>
                <span className="text-xs text-slate-500">{r.reason}</span>
                <span className="text-slate-300">{r.diffs.length ? (openGid === r.gid ? "▾" : "▸") : ""}</span>
              </button>
              {openGid === r.gid && r.diffs.length > 0 && (
                <div className="mb-3 overflow-hidden rounded-xl border border-slate-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-3 py-2 text-left">Area</th><th className="px-3 py-2 text-left">Where</th><th className="px-3 py-2 text-left">Source</th><th className="px-3 py-2 text-left">Target</th></tr></thead>
                    <tbody>{r.diffs.map((d, i) => (
                      <tr key={i} className="border-t border-slate-100 align-top">
                        <td className="px-3 py-2"><Badge tone={d.area === "Action" ? "blue" : d.area === "Reference" ? "violet" : "gray"}>{d.area}</Badge> <span className="text-xs text-slate-500">{d.change}</span></td>
                        <td className="mono px-3 py-2">{d.key}</td>
                        <td className={cx("mono px-3 py-2", d.change !== "added" && "bg-rose-50/60 text-rose-900")}>{d.area === "Reference" ? "Saved condition definition differs between environments" : d.source ?? "—"}</td>
                        <td className={cx("mono px-3 py-2", d.change !== "removed" && "bg-emerald-50/60 text-emerald-900")}>{d.area === "Reference" ? "Review the saved condition SQL" : d.target ?? "—"}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}


export interface ConfigResp { results: { gid: string; status: string; diffs: { field: string; source: unknown; target: unknown }[] }[]; summary: { same: number; different: number; missing: number; total: number } }
export function ConfigResults({ data }: { data: ConfigResp }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Rate offerings" value={data.summary.total} />
        <Stat label="Same" value={data.summary.same} tone="green" />
        <Stat label="Different" value={data.summary.different} tone="amber" />
        <Stat label="Missing" value={data.summary.missing} tone="red" />
      </div>
      <Card className="mt-4" title="Rate offerings">
        <div className="divide-y divide-slate-100">
          {data.results.map((r) => (
            <div key={r.gid}>
              <button onClick={() => setOpen(open === r.gid ? null : r.gid)} className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-slate-50/60">
                <Badge tone={statusTone(r.status)}>{r.status}</Badge><span className="mono flex-1">{r.gid}</span>
                <span className="text-xs text-slate-500">{r.diffs.length ? `${r.diffs.length} field(s): ${r.diffs.map((d) => d.field).join(", ")}` : ""}</span>
              </button>
              {open === r.gid && r.diffs.length > 0 && (
                <table className="mb-3 min-w-full overflow-hidden rounded-lg border border-slate-200 text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-3 py-2 text-left">Field</th><th className="px-3 py-2 text-left">Source</th><th className="px-3 py-2 text-left">Target</th></tr></thead>
                  <tbody>{r.diffs.map((d) => <tr key={d.field} className="border-t border-slate-100"><td className="mono px-3 py-2">{d.field}</td><td className="mono bg-rose-50/60 px-3 py-2">{String(d.source)}</td><td className="mono bg-emerald-50/60 px-3 py-2">{String(d.target)}</td></tr>)}</tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
