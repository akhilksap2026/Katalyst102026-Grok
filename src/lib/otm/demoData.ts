// Deterministic, realistic OTM demo data per tenant domain and environment, with planted drift.
import { TABLES, TABLE_MAP, type Table } from "./dictionary";
import type { Agent } from "../agentDiff";

export type EnvId = "dev" | "test" | "prod";
export type Row = Record<string, string | number | null>;
export interface Dataset { rows: Record<string, Row[]>; agents: Agent[]; conditions: Record<string, string> }

function rng(seedStr: string) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353), (h = (h << 13) | (h >>> 19));
  let a = h >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pad = (n: number) => String(n).padStart(6, "0");

const CITIES = [["Chicago", "IL", "60601", "USA"], ["Dallas", "TX", "75201", "USA"], ["Atlanta", "GA", "30301", "USA"], ["Memphis", "TN", "38103", "USA"], ["Los Angeles", "CA", "90001", "USA"], ["Newark", "NJ", "07102", "USA"], ["Toronto", "ON", "M5H", "CAN"], ["Rotterdam", "ZH", "3011", "NLD"], ["Hamburg", "HH", "20095", "DEU"], ["Antwerp", "VAN", "2000", "BEL"], ["Gothenburg", "O", "41101", "SWE"], ["Mumbai", "MH", "400001", "IND"], ["Monterrey", "NL", "64000", "MEX"], ["Columbus", "OH", "43215", "USA"], ["Reno", "NV", "89501", "USA"]];
const CARRIERS = [["SWIFT", "Swift Transportation"], ["JBHT", "J.B. Hunt"], ["SCNN", "Schneider National"], ["ODFL", "Old Dominion"], ["XPOL", "XPO Logistics"], ["FDEG", "FedEx Ground"], ["UPSN", "UPS"], ["MAEU", "Maersk"], ["DHLX", "DHL Freight"], ["KNIG", "Knight Transport"], ["WERN", "Werner"], ["SAIA", "Saia LTL"]];
const FIXED: Record<string, string[]> = {
  UOM: ["LB", "KG", "CUFT", "CUMTR", "MI", "KM", "EA", "PLT"],
  TIME_ZONE: ["America/Chicago", "America/New_York", "America/Los_Angeles", "Europe/Amsterdam", "Europe/Stockholm", "Asia/Kolkata"],
  CURRENCY: ["USD", "EUR", "SEK", "CAD", "INR", "MXN"],
  COUNTRY_CODE: ["USA", "CAN", "MEX", "NLD", "DEU", "BEL", "SWE", "IND"],
  TRANSPORT_MODE: ["TL", "LTL", "PARCEL", "RAIL", "OCEAN", "AIR", "INTERMODAL"],
  USER_ROLE: ["ADMIN", "PLANNER", "CARRIER", "VIEWER"],
  STATUS_TYPE: ["ENROUTE", "TENDERED", "PLANNING", "INVOICED", "SECURE RESOURCES"],
  ACCESSORIAL_CODE: ["FUEL", "DETENTION", "LIFTGATE", "HAZMAT", "INSIDE_DELIVERY", "RESIDENTIAL"],
  COMMODITY: ["GENERAL", "FROZEN", "HAZMAT_CL3", "ELECTRONICS", "AUTOPARTS", "BEVERAGE"],
};
const COUNTS: Record<string, number> = { LOCATION: 40, CONTACT: 30, CORPORATION: 4, SERVPROV: 12, EQUIPMENT_GROUP: 8, EQUIPMENT: 25, ITEM: 30, PACKAGED_ITEM: 30, RATE_OFFERING: 14, RATE_GEO: 40, RATE_GEO_COST: 60, X_LANE: 25, ITINERARY: 10, LEG: 18, ORDER_BASE: 120, ORDER_RELEASE: 200, ORDER_RELEASE_LINE: 300, SHIPMENT: 150, S_SHIP_UNIT: 200, SHIPMENT_COST: 300, INVOICE: 90, GL_USER: 8, STATUS_VALUE: 12, NOTIFY_SUBJECT: 6, LOCATION_ROLE_PROFILE: 40 };
const PUBLIC_REF = new Set(["UOM", "TIME_ZONE", "CURRENCY", "COUNTRY_CODE", "TRANSPORT_MODE", "STATUS_TYPE", "ACCESSORIAL_CODE"]);
const SKIP_GENERIC = new Set(["AGENT", "AGENT_EVENT_DETAILS", "AGENT_ACTION_DETAILS", "SAVED_CONDITION", "SAVED_QUERY", "DOMAIN"]);

function dateIn2026(r: () => number) {
  const d = new Date(Date.UTC(2026, Math.floor(r() * 10), 1 + Math.floor(r() * 27), Math.floor(r() * 24), Math.floor(r() * 4) * 15));
  return d.toISOString().slice(0, 19).replace("T", " ");
}

function buildBase(D: string): Dataset {
  const r = rng(`base-${D}`);
  const rows: Record<string, Row[]> = {};
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  rows.DOMAIN = [{ DOMAIN_NAME: D, DESCRIPTION: `${D} production domain`, PARENT_DOMAIN_NAME: null, INSERT_USER: "DBA.ADMIN", INSERT_DATE: "2024-01-15 09:00:00", UPDATE_USER: null, UPDATE_DATE: null },
    { DOMAIN_NAME: "PUBLIC", DESCRIPTION: "Oracle seeded data", PARENT_DOMAIN_NAME: null, INSERT_USER: "DBA.ADMIN", INSERT_DATE: "2024-01-15 09:00:00", UPDATE_USER: null, UPDATE_DATE: null }];
  const pkVals = (t: string) => (rows[t] ?? []).map((x) => x[TABLE_MAP[t].pk[0]] as string);
  const done = new Set<string>(["DOMAIN"]);
  const gen = (t: Table) => {
    if (done.has(t.name) || SKIP_GENERIC.has(t.name)) return;
    done.add(t.name);
    t.columns.forEach((c) => c.fk && c.fk !== t.name && TABLE_MAP[c.fk] && gen(TABLE_MAP[c.fk]));
    const fixed = FIXED[t.name];
    const composite = t.pk.length > 1 && t.columns.find((c) => c.name === t.pk[0])?.fk;
    const out: Row[] = [];
    const n = fixed ? fixed.length : COUNTS[t.name] ?? (composite ? 0 : 10);
    const make = (i: number, parent?: string, seq?: number): Row => {
      const dom = PUBLIC_REF.has(t.name) ? "PUBLIC" : D;
      const xid = fixed ? fixed[i] : `${t.prefix}-${pad(i + 1)}`;
      const row: Row = {};
      const city = CITIES[i % CITIES.length], carrier = CARRIERS[i % CARRIERS.length];
      for (const c of t.columns) {
        const nm = c.name;
        let v: string | number | null;
        if (nm === t.pk[0] && !composite) v = t.name === "COUNTRY_CODE" ? xid : `${dom}.${xid}`;
        else if (composite && nm === t.pk[0]) v = parent!;
        else if (composite && nm === t.pk[1]) v = c.type === "NUMBER" ? seq! : `${dom}.${pick(["PO", "BOL", "PRO", "CUST_REF", "SO"])}${seq}`;
        else if (nm === "DOMAIN_NAME") v = dom;
        else if (nm.endsWith("_XID")) v = xid;
        else if (nm === "INSERT_USER" || nm === "UPDATE_USER") v = nm === "UPDATE_USER" && r() < 0.5 ? null : t.name === "GL_USER" ? `${D}.ADMIN` : pick(pkVals("GL_USER")) ?? `${D}.ADMIN`;
        else if (t.name === "LOCATION" && nm === "COUNTRY_CODE3_GID") v = city[3];
        else if (c.fk) {
          const opts = pkVals(c.fk);
          v = opts.length ? pick(opts) : null;
          if (c.fk === t.name) v = null;
        }
        else if (c.type === "DATE") v = dateIn2026(r);
        else if (c.type === "NUMBER") {
          v = /WEIGHT/.test(nm) ? Math.round(200 + r() * 23800) : /COST|AMOUNT|CHARGE/.test(nm) ? Math.round((150 + r() * 4850) * 100) / 100 : /LAT/.test(nm) ? +(25 + r() * 30).toFixed(4) : /LON/.test(nm) ? +(-120 + r() * 140).toFixed(4) : /DISTANCE/.test(nm) ? Math.round(250 + r() * 2750) : /RATING/.test(nm) ? Math.round(60 + r() * 40) : /OFFSET/.test(nm) ? Math.round(-8 + r() * 13) : Math.round(1 + r() * 40);
        }
        else if (nm.startsWith("IS_")) v = r() < 0.85 ? "Y" : "N";
        else if (nm === "CITY") v = city[0];
        else if (nm === "PROVINCE_CODE") v = city[1];
        else if (nm === "POSTAL_CODE") v = city[2];
        else if (nm === "LOCATION_NAME") v = `${city[0]} ${pick(["DC", "Plant", "Cross-dock", "Warehouse", "Port"])} ${i + 1}`;
        else if (nm === "SCAC") v = carrier[0];
        else if (nm === "CORPORATION_NAME") v = `${pick(["Global", "Prime", "United", "Atlas"])} Holdings ${i + 1}`;
        else if (nm === "FIRST_NAME") v = pick(["Anna", "Raj", "Maria", "Tom", "Sven", "Lena", "Omar", "Mei"]);
        else if (nm === "LAST_NAME") v = pick(["Smith", "Patel", "Garcia", "Berg", "Kim", "Nowak", "Ali"]);
        else if (nm === "EMAIL_ADDRESS") v = `ops${i + 1}@${D.toLowerCase()}-partner.com`;
        else if (nm === "PHONE") v = `+1-555-${String(1000 + i).slice(-4)}`;
        else if (nm === "STATUS") v = pick(["PLANNED", "UNPLANNED", "TENDERED", "IN TRANSIT", "DELIVERED"]);
        else if (nm === "STOP_TYPE") v = seq === 1 ? "P" : "D";
        else if (nm === "COST_TYPE") v = pick(["B", "A", "D"]);
        else if (nm === "UOM_TYPE") v = ["WEIGHT", "WEIGHT", "VOLUME", "VOLUME", "LENGTH", "LENGTH", "COUNT", "COUNT"][i] ?? "COUNT";
        else if (nm === "OBJECT_TYPE") v = "SHIPMENT";
        else if (nm === "COUNTRY_NAME") v = { USA: "United States", CAN: "Canada", MEX: "Mexico", NLD: "Netherlands", DEU: "Germany", BEL: "Belgium", SWE: "Sweden", IND: "India" }[xid] ?? xid;
        else if (nm === "ITINERARY_NAME") v = `${pick(CITIES)[0]} → ${pick(CITIES)[0]} ${pick(["TL", "LTL", "Multi-stop"])}`;
        else if (nm === "ITEM_NAME") v = `${pick(["Pallet", "Carton", "Drum", "Crate"])} of ${pick(["widgets", "auto parts", "beverages", "electronics", "resin"])}`;
        else if (nm === "NICKNAME") v = pick(["planner", "admin", "carrier ops", "integration"]);
        else if (nm === "DESCRIPTION") v = fixed ? `${xid.replace(/_/g, " ")}` : `${t.description} ${i + 1}`;
        else v = `${xid}`;
        row[nm] = v;
      }
      if (t.name === "SERVPROV") row.SERVPROV_GID = `${D}.${carrier[0]}`;
      return row;
    };
    if (composite) {
      const parents = pkVals(t.columns.find((c) => c.name === t.pk[0])!.fk!);
      parents.forEach((p, pi) => { const k = 1 + Math.floor(r() * 3); for (let s = 1; s <= k; s++) out.push(make(pi, p, s)); });
    } else for (let i = 0; i < n; i++) out.push(make(i));
    rows[t.name] = out;
  };
  TABLES.forEach(gen);
  const ag = agentsFor(D);
  rows.SAVED_QUERY = ag.queries;
  rows.SAVED_CONDITION = Object.entries(ag.conditions).map(([gid, sql]) => ({ SAVED_CONDITION_GID: gid, QUERY_NAME: `${gid}_Q`, DESCRIPTION: sql, DOMAIN_NAME: D, INSERT_USER: `${D}.ADMIN`, INSERT_DATE: "2026-03-02 10:00:00", UPDATE_USER: null, UPDATE_DATE: null }));
  return { rows, agents: ag.agents, conditions: ag.conditions };
}

function agentsFor(D: string) {
  const conditions: Record<string, string> = {
    [`${D}.SC_TL_ONLY`]: "SELECT 'Y' FROM SHIPMENT WHERE SHIPMENT_GID = ? AND TRANSPORT_MODE_GID = 'PUBLIC.TL'",
    [`${D}.SC_INV_TOLERANCE`]: "SELECT 'Y' FROM INVOICE i JOIN SHIPMENT s ON s.SHIPMENT_GID = i.SHIPMENT_GID WHERE ABS(i.NET_AMOUNT_DUE - s.TOTAL_ACTUAL_COST) <= s.TOTAL_ACTUAL_COST * 0.05",
    [`${D}.SC_HAZMAT`]: "SELECT 'Y' FROM ORDER_RELEASE_LINE l JOIN PACKAGED_ITEM p ON p.PACKAGED_ITEM_GID = l.PACKAGED_ITEM_GID WHERE p.ITEM_GID LIKE '%HAZ%'",
    [`${D}.SC_LATE_STOP`]: "SELECT 'Y' FROM SHIPMENT_STOP WHERE ACTUAL_ARRIVAL > PLANNED_ARRIVAL + 2/24",
  };
  const base = { dataQueryType: "SHIPMENT", insertDate: "2026-02-10 08:00:00", updateUser: `${D}.ADMIN`, updateDate: "2026-09-12 14:20:00" };
  const agents: Agent[] = [
    { ...base, gid: `${D}.SHIPMENT_TENDER_AUTO`, description: "Auto-tender TL shipments to primary carrier", isActive: true,
      events: [{ seq: 1, event: "SHIPMENT - CREATED", savedCondition: `${D}.SC_TL_ONLY` }],
      actions: [
        { parent: "ROOT", seq: 1, action: "IF", params: `SAVED_CONDITION=${D}.SC_TL_ONLY` },
        { parent: "IF-1", seq: 1, action: "TENDER SHIPMENT", params: `TENDER_TYPE=AUTO; SERVPROV=${D}.SWIFT` },
        { parent: "IF-1", seq: 2, action: "SET INDICATOR", params: "INDICATOR=G" },
        { parent: "ELSE-1", seq: 1, action: "SEND NOTIFICATION", params: "CONTACT=PLANNING_DESK", notify: `${D}.NS-000001` },
      ] },
    { ...base, dataQueryType: "ORDER RELEASE", gid: `${D}.ORDER_RELEASE_PLAN`, description: "Bulk plan new order releases", isActive: true,
      events: [{ seq: 1, event: "ORDER RELEASE - NEW" }],
      actions: [{ parent: "ROOT", seq: 1, action: "BULK PLAN", params: `PLANNING_PARAM_SET=${D}.DEFAULT; SAVED_QUERY=${D}.SQ_UNPLANNED_OR` }] },
    { ...base, gid: `${D}.SHIPMENT_ETA_ALERT`, description: "Alert customer service on late stop arrival", isActive: true,
      events: [{ seq: 1, event: "SHIPMENT - STOP ACTUAL ARRIVAL", savedCondition: `${D}.SC_LATE_STOP` }],
      actions: [{ parent: "ROOT", seq: 1, action: "SEND NOTIFICATION", params: "CONTACT=CS_TEAM; TEMPLATE=LATE_ARRIVAL", notify: `${D}.NS-000002` }] },
    { ...base, dataQueryType: "INVOICE", gid: `${D}.INVOICE_AUTO_APPROVE`, description: "Auto-approve invoices within tolerance", isActive: true,
      events: [{ seq: 1, event: "INVOICE - CREATED", savedCondition: `${D}.SC_INV_TOLERANCE` }],
      actions: [{ parent: "ROOT", seq: 1, action: "IF", params: `SAVED_CONDITION=${D}.SC_INV_TOLERANCE` },
        { parent: "IF-1", seq: 1, action: "APPROVE INVOICE", params: "TOLERANCE_PCT=5" },
        { parent: "ELSE-1", seq: 1, action: "ASSIGN STATUS", params: "STATUS=APPROVAL_HOLD" }] },
    { ...base, gid: `${D}.CARRIER_REJECT_RETENDER`, description: "Re-tender to next carrier when rejected", isActive: true,
      events: [{ seq: 1, event: "SHIPMENT - TENDER DECLINED" }],
      actions: [{ parent: "ROOT", seq: 1, action: "TENDER SHIPMENT", params: "TENDER_TYPE=NEXT_IN_RANK" }] },
    { ...base, dataQueryType: "ORDER RELEASE", gid: `${D}.ORDER_HOLD_HAZMAT`, description: "Hold hazmat orders for compliance review", isActive: true,
      events: [{ seq: 1, event: "ORDER RELEASE - NEW", savedCondition: `${D}.SC_HAZMAT` }],
      actions: [{ parent: "ROOT", seq: 1, action: "ASSIGN STATUS", params: "STATUS=COMPLIANCE_HOLD" },
        { parent: "ROOT", seq: 2, action: "SEND NOTIFICATION", params: "CONTACT=HSE_TEAM", notify: `${D}.NS-000003` }] },
    { ...base, gid: `${D}.SHIPMENT_COST_RECALC`, description: "Recalculate cost on stop change", isActive: true,
      events: [{ seq: 1, event: "SHIPMENT - STOPS MODIFIED" }],
      actions: [{ parent: "ROOT", seq: 1, action: "RERATE SHIPMENT", params: `RATE_OFFERING=${D}.RO-000001` }] },
    { ...base, dataQueryType: "LOCATION", gid: `${D}.LOCATION_SYNC_ERP`, description: "Send location changes to ERP", isActive: true,
      events: [{ seq: 1, event: "LOCATION - MODIFIED" }],
      actions: [{ parent: "ROOT", seq: 1, action: "SEND INTEGRATION", params: "OUT_XML_PROFILE=ERP_LOCATION; EXTERNAL_SYSTEM=SAP_S4" }] },
    { ...base, gid: `${D}.TRACKING_EVENT_STATUS`, description: "Update status on carrier tracking event", isActive: true,
      events: [{ seq: 1, event: "SHIPMENT - TRACKING EVENT RECEIVED" }],
      actions: [{ parent: "ROOT", seq: 1, action: "ASSIGN STATUS", params: "STATUS_TYPE=PUBLIC.ENROUTE; VALUE=ENROUTE_STARTED" }] },
    { ...base, dataQueryType: "RATE OFFERING", gid: `${D}.RATE_EXPIRY_NOTIFY`, description: "Warn procurement 30 days before rate expiry", isActive: true,
      events: [{ seq: 1, event: "SCHEDULED - DAILY 06:00" }],
      actions: [{ parent: "ROOT", seq: 1, action: "SEND NOTIFICATION", params: `SAVED_QUERY=${D}.SQ_EXPIRING_RATES; CONTACT=PROCUREMENT`, notify: `${D}.NS-000004` }] },
  ];
  const queries: Row[] = [
    ["SQ_UNPLANNED_OR", "ORDER_RELEASE", "SELECT ORDER_RELEASE_GID FROM ORDER_RELEASE WHERE STATUS = 'UNPLANNED'"],
    ["SQ_EXPIRING_RATES", "RATE_OFFERING", "SELECT RATE_OFFERING_GID FROM RATE_OFFERING WHERE EXPIRATION_DATE < SYSDATE + 30"],
    ...Object.keys(conditions).map((c) => [`${c.split(".")[1]}_Q`, "SHIPMENT", conditions[c]]),
  ].map(([n, t, s]) => ({ QUERY_NAME: `${D}.${n}`, QUERY_TABLE: t, SQL_TEXT: s, DOMAIN_NAME: D, INSERT_USER: `${D}.ADMIN`, INSERT_DATE: "2026-03-01 09:00:00", UPDATE_USER: null, UPDATE_DATE: null }));
  return { agents, conditions, queries };
}

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

function renameDomain(ds: Dataset, from: string, to: string): Dataset {
  const re = new RegExp(`^${from}\\.`);
  const fix = (v: unknown) => (typeof v === "string" ? (v === from ? to : v.replace(re, `${to}.`).replace(new RegExp(`=${from}\\.`, "g"), `=${to}.`)) : v);
  const rows = Object.fromEntries(Object.entries(ds.rows).map(([t, rs]) => [t, rs.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, fix(v)])) as Row)]));
  const agents = ds.agents.map((a) => JSON.parse(JSON.stringify(a), (_k, v) => fix(v)));
  const conditions = Object.fromEntries(Object.entries(ds.conditions).map(([k, v]) => [fix(k) as string, v]));
  return { rows, agents, conditions };
}

function applyDrift(ds: Dataset, D: string, env: EnvId): Dataset {
  if (env === "dev") return ds;
  const d = clone(ds);
  const ro = d.rows.RATE_OFFERING;
  const find = (gid: string) => ro.find((r) => r.RATE_OFFERING_GID === gid);
  const ag = (suffix: string) => d.agents.find((a) => a.gid === `${D}.${suffix}`)!;
  if (env === "test") {
    d.rows.SHIPMENT = d.rows.SHIPMENT.slice(0, 135);
    const r3 = find(`${D}.RO-000003`); if (r3) r3.MAX_DISTANCE = 1500;
    const r7 = find(`${D}.RO-000007`); if (r7) r7.IS_ACTIVE = "N";
    ag("SHIPMENT_ETA_ALERT").actions[0].notify = `${D}.NS-000005`;
    d.agents = d.agents.filter((a) => a.gid !== `${D}.TRACKING_EVENT_STATUS`);
    d.agents.forEach((a) => (a.updateDate = "2026-10-01 11:00:00"));
    return d;
  }
  // prod: older config, different domain name (mapped with Domain mapping)
  d.rows.SHIPMENT = d.rows.SHIPMENT.concat(d.rows.SHIPMENT.slice(0, 60).map((s, i) => ({ ...s, SHIPMENT_GID: `${D}.SH-${pad(1000 + i)}`, SHIPMENT_XID: `SH-${pad(1000 + i)}` })));
  const r2 = find(`${D}.RO-000002`); if (r2) r2.CURRENCY_GID = "PUBLIC.EUR";
  const r5 = find(`${D}.RO-000005`); if (r5) r5.EXPIRATION_DATE = "2026-12-31 23:59:00";
  d.rows.RATE_OFFERING = ro.filter((r) => r.RATE_OFFERING_GID !== `${D}.RO-000009`).concat([{ ...ro[0], RATE_OFFERING_GID: `${D}.RO-000099`, RATE_OFFERING_XID: "RO-000099" }]);
  ag("SHIPMENT_TENDER_AUTO").actions = ag("SHIPMENT_TENDER_AUTO").actions.filter((a) => !(a.parent === "IF-1" && a.seq === 2));
  ag("INVOICE_AUTO_APPROVE").actions[1].params = "TOLERANCE_PCT=10";
  ag("ORDER_HOLD_HAZMAT").isActive = false;
  d.conditions[`${D}.SC_INV_TOLERANCE`] = d.conditions[`${D}.SC_INV_TOLERANCE`].replace("0.05", "0.10");
  d.agents = d.agents.filter((a) => ![`${D}.LOCATION_SYNC_ERP`, `${D}.RATE_EXPIRY_NOTIFY`].includes(a.gid));
  d.agents.push({ gid: `${D}.LEGACY_EDI_214`, description: "Legacy EDI 214 status handler (pre-go-live)", isActive: true, dataQueryType: "SHIPMENT",
    events: [{ seq: 1, event: "SHIPMENT - EDI 214 RECEIVED" }], actions: [{ parent: "ROOT", seq: 1, action: "ASSIGN STATUS", params: "STATUS=LEGACY" }] });
  d.agents.forEach((a) => (a.updateDate = "2025-11-20 09:30:00", a.updateUser = `${D}.MIGRATION`));
  return renameDomain(d, D, `${D}_PRD`);
}

function toAgentRows(ds: Dataset, domain: string) {
  ds.rows.AGENT = ds.agents.map((a) => ({ AGENT_GID: a.gid, AGENT_XID: a.gid.split(".")[1], DESCRIPTION: a.description, DATA_QUERY_TYPE_GID: a.dataQueryType, IS_ACTIVE: a.isActive ? "Y" : "N", RESTRICTION: a.restriction ?? null, DOMAIN_NAME: domain, INSERT_USER: `${domain}.ADMIN`, INSERT_DATE: a.insertDate ?? null, UPDATE_USER: a.updateUser ?? null, UPDATE_DATE: a.updateDate ?? null }));
  ds.rows.AGENT_EVENT_DETAILS = ds.agents.flatMap((a) => a.events.map((e) => ({ AGENT_GID: a.gid, AGENT_EVENT_SEQ: e.seq, AGENT_EVENT_GID: e.event, SAVED_CONDITION_GID: e.savedCondition ?? null, DOMAIN_NAME: domain, INSERT_USER: `${domain}.ADMIN`, INSERT_DATE: a.insertDate ?? null, UPDATE_USER: null, UPDATE_DATE: null })));
  ds.rows.AGENT_ACTION_DETAILS = ds.agents.flatMap((a) => a.actions.map((x) => ({ AGENT_GID: a.gid, ACTION_SEQUENCE: x.seq, PARENT_BLOCK: x.parent, AGENT_ACTION_GID: x.action, ACTION_PARAMETERS: x.params, NOTIFY_SUBJECT_GID: x.notify ?? null, DOMAIN_NAME: domain, INSERT_USER: `${domain}.ADMIN`, INSERT_DATE: a.insertDate ?? null, UPDATE_USER: null, UPDATE_DATE: null })));
  return ds;
}

const memo = new Map<string, Dataset>();
export function getDataset(domain: string, env: EnvId): Dataset {
  const k = `${domain}|${env}`;
  if (!memo.has(k)) memo.set(k, toAgentRows(applyDrift(buildBase(domain), domain, env), env === "prod" ? `${domain}_PRD` : domain));
  return memo.get(k)!;
}
