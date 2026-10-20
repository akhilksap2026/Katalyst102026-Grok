"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Session } from "@/lib/auth";

const Ctx = createContext<Session | null>(null);
export function SessionProvider({ value, children }: { value: Session; children: React.ReactNode }) { return <Ctx.Provider value={value}>{children}</Ctx.Provider>; }
export const useSession = () => useContext(Ctx)!;

// OTM tokens live only in this tab's sessionStorage. Secrets are never stored at all.
export interface Conn { token: string; otmUser: string; domain: string; version: string; at: number; ok: boolean; error?: string }
const key = (tenant: string) => `katalyst:otm:${tenant}`;
export function useConnections() {
  const s = useSession();
  const [conns, setConns] = useState<Record<string, Conn>>({});
  const load = useCallback(() => { try { setConns(JSON.parse(sessionStorage.getItem(key(s.tenant.id)) ?? "{}")); } catch { setConns({}); } }, [s.tenant.id]);
  useEffect(() => {
    load();
    const h = () => load();
    window.addEventListener("katalyst:conn", h);
    return () => window.removeEventListener("katalyst:conn", h);
  }, [load]);
  const save = (env: string, c: Conn | null) => {
    const cur = JSON.parse(sessionStorage.getItem(key(s.tenant.id)) ?? "{}");
    if (c) cur[env] = c; else delete cur[env];
    sessionStorage.setItem(key(s.tenant.id), JSON.stringify(cur));
    window.dispatchEvent(new Event("katalyst:conn"));
  };
  const tokens = Object.fromEntries(Object.entries(conns).filter(([, c]) => c.ok).map(([e, c]) => [e, c.token]));
  return { conns, save, tokens };
}
