// OTM connector interface. MockOtmConnector serves demo data; DbxmlOtmConnector is the swap-in seam for real OTM.
import alasql from "alasql";
import crypto from "crypto";
import { getDataset, type EnvId, type Row } from "./demoData";
import type { EnvProfile } from "../types";
import type { Agent } from "../agentDiff";

export interface QueryResult { columns: string[]; rows: Row[]; total: number; elapsedMs: number }
export interface TokenResult { token: string; expiresIn: number; otmUser: string; domain: string; version: string }

export interface OtmConnector {
  getToken(profile: EnvProfile, clientSecret: string): Promise<TokenResult>;
  /** Run a guarded, read-only SELECT. offset/size are validated integers (DBXML has no bind variables). */
  query(profile: EnvProfile, token: string, sql: string, offset: number, size: number): Promise<QueryResult>;
  exportAgents(profile: EnvProfile, token: string): Promise<{ agents: Agent[]; conditions: Record<string, string> }>;
}

export class OtmError extends Error { constructor(public status: number, msg: string) { super(msg); } }

// Stateless signed mock token (works across Next.js route bundles).
const TOKEN_KEY = "katalyst-mock-otm";
const mac = (v: string) => crypto.createHmac("sha256", TOKEN_KEY).update(v).digest("base64url").slice(0, 22);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class MockOtmConnector implements OtmConnector {
  constructor(private tenantDomain: string) {}
  private env(p: EnvProfile): EnvId { return p.id; }

  async getToken(p: EnvProfile, secret: string): Promise<TokenResult> {
    await sleep(250);
    if (!secret) throw new OtmError(401, `${p.label} rejected the login: client secret is empty.`);
    if (/wrong|invalid/i.test(secret)) throw new OtmError(401, `${p.label} rejected the login. Check the client secret or ask for basic-auth access.`);
    const body = `${p.url}|${Date.now() + 3600_000}`;
    const token = `mock.${Buffer.from(body).toString("base64url")}.${mac(body)}`;
    return { token, expiresIn: 3600, otmUser: p.otmUser, domain: p.domain, version: "OTM 26B (demo)" };
  }

  private check(p: EnvProfile, token: string) {
    const [, b, m] = (token ?? "").split(".");
    const body = b ? Buffer.from(b, "base64url").toString() : "";
    const [url, exp] = body.split("|");
    if (!m || mac(body) !== m || url !== p.url || Number(exp) < Date.now()) throw new OtmError(401, `Session for ${p.label} expired. Reconnect in Connections.`);
  }

  async query(p: EnvProfile, token: string, sql: string, offset: number, size: number): Promise<QueryResult> {
    this.check(p, token);
    const started = Date.now();
    const ds = getDataset(this.tenantDomain, this.env(p));
    const db = new alasql.Database();
    for (const [t, rows] of Object.entries(ds.rows)) {
      db.exec(`CREATE TABLE ${t}`);
      (db.tables as Record<string, { data: Row[] }>)[t].data = rows;
    }
    const cleaned = sql.trim().replace(/;\s*$/, "")
      .replace(/\bSYSDATE\b/gi, "'2026-10-20 10:00:00'")
      .replace(/\bNVL\s*\(/gi, "COALESCE(")
      .replace(/\bFROM\s+DUAL\b/gi, "")
      .replace(/\bFETCH\s+(FIRST|NEXT)\s+\d+\s+ROWS\s+ONLY\b/gi, "")
      .replace(/\bOFFSET\s+\d+\s+ROWS\b/gi, "");
    let all: Row[];
    try {
      all = db.exec(cleaned) as Row[];
    } catch (e) {
      throw new OtmError(400, `ORA-00900 (demo evaluator): ${(e as Error).message.split("\n")[0]}`);
    }
    if (!Array.isArray(all)) all = [];
    const columns = all.length ? Object.keys(all[0]) : [];
    await sleep(120 + Math.min(400, all.length));
    return { columns, rows: all.slice(offset, offset + size), total: all.length, elapsedMs: Date.now() - started };
  }

  async exportAgents(p: EnvProfile, token: string) {
    this.check(p, token);
    await sleep(200);
    const ds = getDataset(this.tenantDomain, this.env(p));
    return { agents: JSON.parse(JSON.stringify(ds.agents)) as Agent[], conditions: { ...ds.conditions } };
  }
}

/** Real implementation placeholder. Wire DbxmlCodec (O-1) and IDCS/basic auth (A-4) here. */
export class DbxmlOtmConnector implements OtmConnector {
  async getToken(): Promise<TokenResult> { throw new OtmError(501, "Real DBXML connector not configured (set OTM_CONNECTOR=dbxml once O-1/A-4 are confirmed)."); }
  async query(): Promise<QueryResult> { throw new OtmError(501, "Real DBXML connector not configured."); }
  async exportAgents(): Promise<{ agents: Agent[]; conditions: Record<string, string> }> { throw new OtmError(501, "Real DBXML connector not configured."); }
}

export function connectorFor(tenantDomain: string): OtmConnector {
  return process.env.OTM_CONNECTOR === "dbxml" ? new DbxmlOtmConnector() : new MockOtmConnector(tenantDomain);
}

/** Rate offerings as config objects for Config Compare. */
export function rateOfferings(tenantDomain: string, env: EnvId): Row[] {
  return getDataset(tenantDomain, env).rows.RATE_OFFERING;
}
