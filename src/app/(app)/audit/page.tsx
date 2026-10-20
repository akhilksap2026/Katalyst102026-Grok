"use client";
import { useEffect, useState } from "react";
import { Card, PageHeader, Alert, api } from "@/components/ui";
import { Gate } from "@/components/Upgrade";
import type { AuditEntry } from "@/lib/types";
import { AuditTable } from "@/components/AuditTable";

function AuditInner() {
  const [rows, setRows] = useState<AuditEntry[]>([]);
  const [err, setErr] = useState("");
  useEffect(() => { api<AuditEntry[]>("/api/admin/audit").then(setRows).catch((e) => setErr(e.message)); }, []);
  return (
    <div>
      <PageHeader icon="🧾" title="Audit log" subtitle="Who connected, compared and ran which query — never the results." />
      {err ? <Alert tone="red">{err}</Alert> : <Card><AuditTable rows={rows} /></Card>}
    </div>
  );
}
export default function Page() { return <Gate feature="audit_log"><AuditInner /></Gate>; }
