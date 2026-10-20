"use client";
import type { AuditEntry } from "@/lib/types";

export function AuditTable({ rows }: { rows: AuditEntry[] }) {
  return (
    <div className="scroll-thin max-h-[70vh] overflow-auto">
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 bg-white text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="py-2 pr-4">When</th><th className="pr-4">Who</th><th className="pr-4">Action</th><th className="pr-4">Tenant</th><th>Detail</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.id} className="border-t border-slate-100 align-top"><td className="whitespace-nowrap py-2 pr-4 text-slate-500">{new Date(r.at).toLocaleString()}</td><td className="pr-4">{r.actor}</td><td className="mono pr-4">{r.action}</td><td className="pr-4">{r.tenantId ?? "—"}</td><td className="mono text-slate-600">{r.detail}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

