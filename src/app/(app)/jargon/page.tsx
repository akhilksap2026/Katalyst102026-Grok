"use client";
import { useMemo, useState } from "react";
import { processList, type CleanOptions, type DomainAction, type Format } from "@/lib/listCleaner";
import { Button, Card, PageHeader, Alert, cx, useToast } from "@/components/ui";
import { Gate } from "@/components/Upgrade";
import { useSession } from "@/components/session";

const FORMATS: { id: Format; label: string }[] = [{ id: "single", label: "'Single'" }, { id: "double", label: '"Double"' }, { id: "csv", label: "Raw CSV" }, { id: "in", label: "SQL IN" }, { id: "lines", label: "One per line" }];
const SAMPLE = `KSAP.SH-000123\nKSAP.SH-000124, KSAP.SH-000125;\n['KSAP.SH-000123']\nPUBLIC.SH-000124\nsh-000200\n  KSAP.SH-000201  \nO'NEIL_DC`;

function JargonInner() {
  const s = useSession();
  const toast = useToast();
  const [input, setInput] = useState("");
  const [opts, setOpts] = useState<CleanOptions>({ format: "single", caseMode: "none", dedupe: true, domainActions: [] });
  const [addD, setAddD] = useState(s.tenant.domain);
  const [from, setFrom] = useState(s.tenant.domain);
  const [to, setTo] = useState(`${s.tenant.domain}_PRD`);
  const res = useMemo(() => processList(input, opts), [input, opts]);
  const change = (next: CleanOptions, label: string) => {
    const prev = opts;
    setOpts(next);
    toast({ text: `${label} · applied`, action: { label: "Undo", run: () => setOpts(prev) } }, 5000);
  };
  const addAction = (a: DomainAction, label: string) => change({ ...opts, domainActions: [...opts.domainActions, a] }, label);
  const copy = async () => { await navigator.clipboard.writeText(res.output); toast({ text: `Copied ${res.uniqueOut} IDs` }); };
  return (
    <div>
      <PageHeader icon="🧹" title="Column Jargon" subtitle="Paste IDs from anywhere — get clean lists and SQL IN clauses instantly. Runs entirely in your browser." />
      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            {FORMATS.map((f) => <button key={f.id} onClick={() => setOpts({ ...opts, format: f.id })} className={cx("rounded-md px-3 py-1.5 text-sm", opts.format === f.id ? "bg-white font-medium text-brand-700 shadow" : "text-slate-600")}>{f.label}</button>)}
          </div>
          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            {(["none", "upper", "lower"] as const).map((c) => <button key={c} onClick={() => c !== opts.caseMode && change({ ...opts, caseMode: c }, c === "none" ? "Original case" : c === "upper" ? "UPPERCASE" : "lowercase")} className={cx("rounded-md px-3 py-1.5 text-sm", opts.caseMode === c ? "bg-white font-medium text-brand-700 shadow" : "text-slate-600")}>{c === "none" ? "Aa" : c === "upper" ? "AA" : "aa"}</button>)}
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={opts.dedupe} onChange={(e) => setOpts({ ...opts, dedupe: e.target.checked })} /> Remove duplicates</label>
          <Button variant="ghost" size="sm" onClick={() => setInput(SAMPLE)}>Load sample</Button>
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
          <div className="flex items-end gap-1"><div><label className="label">Add domain</label><input className="input w-28" value={addD} onChange={(e) => setAddD(e.target.value)} /></div><Button variant="secondary" onClick={() => addAction({ kind: "add", domain: addD }, `Add ${addD.toUpperCase()}.`)}>Add</Button></div>
          <div className="flex items-end gap-1"><div><label className="label">Replace</label><input className="input w-28" value={from} onChange={(e) => setFrom(e.target.value)} /></div><span className="pb-2 text-slate-400">→</span><input className="input w-32" value={to} onChange={(e) => setTo(e.target.value)} /><Button variant="secondary" onClick={() => addAction({ kind: "replace", from, to }, `Replace ${from.toUpperCase()} → ${to.toUpperCase()}`)}>Replace</Button></div>
          <Button variant="secondary" onClick={() => addAction({ kind: "remove" }, "Remove domain")}>Remove domain</Button>
          {opts.domainActions.length > 0 && <Button variant="ghost" size="sm" onClick={() => change({ ...opts, domainActions: [] }, "Cleared domain actions")}>Clear {opts.domainActions.length} domain action(s)</Button>}
        </div>
        <p className="mt-2 text-xs text-slate-400">PUBLIC.* IDs are never changed by Replace. Duplicates are removed again after domain and case actions.</p>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Input" actions={<span className="text-xs text-slate-400">newline, comma, semicolon or tab separated</span>}>
          <textarea className="input mono h-[420px] resize-none" placeholder="Paste shipment, order or location IDs…" value={input} onChange={(e) => setInput(e.target.value)} />
        </Card>
        <Card title="Output" actions={<><Button size="sm" variant="secondary" onClick={() => addAction({ kind: "remove" }, "Remove domain")}>Remove domain</Button><Button size="sm" onClick={copy} disabled={!res.output}>Copy</Button></>}>
          {res.warning && <div className="mb-3"><Alert>⚠️ {res.warning}</Alert></div>}
          <textarea readOnly className="input mono h-[380px] resize-none bg-slate-50" value={res.output} />
          <div className="mt-2 text-sm text-slate-600"><b>{res.rowsIn}</b> rows in → <b>{res.uniqueOut}</b> {opts.dedupe ? "unique " : ""}out</div>
        </Card>
      </div>
    </div>
  );
}
export default function Page() { return <Gate feature="column_jargon"><JargonInner /></Gate>; }
