// Static OTM-like data dictionary (sample of ~40 tables). Real build: generated from data_dict.zip.
export type ColType = "VARCHAR2" | "NUMBER" | "DATE";
export interface Column { name: string; type: ColType; fk?: string; nullable?: boolean; note?: string }
export interface Table { name: string; description: string; category: string; pk: string[]; prefix: string; columns: Column[] }
export interface ForeignKey { from: string; fromCol: string; to: string; toCol: string; label: string }

type Spec = [name: string, category: string, prefix: string, description: string, cols: string[], pk?: string[]];
// col syntax: NAME (VARCHAR2), NAME#  (NUMBER), NAME@ (DATE), NAME>TABLE (FK to TABLE's PK)
const SPECS: Spec[] = [
  ["DOMAIN", "Platform", "DOM", "OTM security domain (hub)", ["DOMAIN_NAME", "DESCRIPTION", "PARENT_DOMAIN_NAME"], ["DOMAIN_NAME"]],
  ["GL_USER", "Platform", "USR", "OTM application user (hub)", ["GL_USER_GID", "GL_USER_XID", "USER_ROLE_GID>USER_ROLE", "NICKNAME", "IS_ACTIVE"]],
  ["USER_ROLE", "Platform", "ROLE", "User role", ["USER_ROLE_GID", "USER_ROLE_XID", "DESCRIPTION"]],
  ["UOM", "Reference", "UOM", "Unit of measure (hub)", ["UOM_GID", "UOM_TYPE", "DESCRIPTION"]],
  ["TIME_ZONE", "Reference", "TZ", "Time zone (hub)", ["TIME_ZONE_GID", "TIME_ZONE_XID", "UTC_OFFSET#"]],
  ["CURRENCY", "Reference", "CUR", "Currency", ["CURRENCY_GID", "DESCRIPTION", "DECIMAL_PLACES#"]],
  ["COUNTRY_CODE", "Reference", "CC", "Country", ["COUNTRY_CODE3_GID", "COUNTRY_NAME"], ["COUNTRY_CODE3_GID"]],
  ["STATUS_TYPE", "Reference", "ST", "Status type", ["STATUS_TYPE_GID", "OBJECT_TYPE", "DESCRIPTION"]],
  ["STATUS_VALUE", "Reference", "SV", "Status value", ["STATUS_VALUE_GID", "STATUS_TYPE_GID>STATUS_TYPE", "DESCRIPTION"]],
  ["LOCATION", "Master data", "LOC", "Location (address, dock, plant)", ["LOCATION_GID", "LOCATION_XID", "LOCATION_NAME", "CITY", "PROVINCE_CODE", "POSTAL_CODE", "COUNTRY_CODE3_GID>COUNTRY_CODE", "TIME_ZONE_GID>TIME_ZONE", "LAT#", "LON#", "IS_ACTIVE"]],
  ["LOCATION_ROLE_PROFILE", "Master data", "LRP", "Location role (ship-from, ship-to, carrier)", ["LOCATION_GID>LOCATION", "LOCATION_ROLE_GID", "CALENDAR_GID"], ["LOCATION_GID", "LOCATION_ROLE_GID"]],
  ["CONTACT", "Master data", "CON", "Contact", ["CONTACT_GID", "LOCATION_GID>LOCATION", "FIRST_NAME", "LAST_NAME", "EMAIL_ADDRESS", "PHONE"]],
  ["CORPORATION", "Master data", "CORP", "Corporation", ["CORPORATION_GID", "CORPORATION_NAME", "IS_DOMAIN_MASTER"]],
  ["SERVPROV", "Master data", "SP", "Service provider (carrier)", ["SERVPROV_GID", "LOCATION_GID>LOCATION", "SCAC", "IS_DISPATCH_BY_REGION", "TENDER_RESPONSE_TIME#", "RATING#"]],
  ["TRANSPORT_MODE", "Reference", "TM", "Transport mode (TL, LTL, Parcel…)", ["TRANSPORT_MODE_GID", "TRANSPORT_MODE_XID", "DESCRIPTION"]],
  ["EQUIPMENT_GROUP", "Master data", "EG", "Equipment group", ["EQUIPMENT_GROUP_GID", "EQUIPMENT_GROUP_XID", "MAX_WEIGHT#", "WEIGHT_UOM_CODE>UOM", "MAX_VOLUME#"]],
  ["EQUIPMENT", "Master data", "EQ", "Equipment", ["EQUIPMENT_GID", "EQUIPMENT_GROUP_GID>EQUIPMENT_GROUP", "EQUIPMENT_NUMBER"]],
  ["ITEM", "Master data", "ITM", "Item", ["ITEM_GID", "ITEM_NAME", "WEIGHT#", "WEIGHT_UOM_CODE>UOM", "COMMODITY_GID>COMMODITY"]],
  ["COMMODITY", "Master data", "CMD", "Commodity", ["COMMODITY_GID", "DESCRIPTION", "IS_HAZARDOUS"]],
  ["PACKAGED_ITEM", "Master data", "PI", "Packaged item", ["PACKAGED_ITEM_GID", "ITEM_GID>ITEM", "PACKAGING_UNIT_GID"]],
  ["RATE_OFFERING", "Rates", "RO", "Rate offering (carrier contract)", ["RATE_OFFERING_GID", "RATE_OFFERING_XID", "SERVPROV_GID>SERVPROV", "TRANSPORT_MODE_GID>TRANSPORT_MODE", "CURRENCY_GID>CURRENCY", "EQUIPMENT_GROUP_GID>EQUIPMENT_GROUP", "MAX_DISTANCE#", "IS_ACTIVE", "EFFECTIVE_DATE@", "EXPIRATION_DATE@"]],
  ["RATE_GEO", "Rates", "RG", "Rate record (lane)", ["RATE_GEO_GID", "RATE_OFFERING_GID>RATE_OFFERING", "X_LANE_GID>X_LANE", "MIN_COST#", "IS_ACTIVE"]],
  ["RATE_GEO_COST", "Rates", "RGC", "Rate cost line", ["RATE_GEO_COST_GROUP_GID", "RATE_GEO_GID>RATE_GEO", "CHARGE_AMOUNT#", "CHARGE_UNIT_UOM_CODE>UOM"], ["RATE_GEO_COST_GROUP_GID"]],
  ["X_LANE", "Rates", "XL", "Lane", ["X_LANE_GID", "SOURCE_LOCATION_GID>LOCATION", "DEST_LOCATION_GID>LOCATION", "SOURCE_COUNTRY_CODE3_GID>COUNTRY_CODE", "DEST_COUNTRY_CODE3_GID>COUNTRY_CODE"]],
  ["ACCESSORIAL_CODE", "Rates", "ACC", "Accessorial charge code", ["ACCESSORIAL_CODE_GID", "DESCRIPTION"]],
  ["ITINERARY", "Planning", "IT", "Itinerary", ["ITINERARY_GID", "ITINERARY_NAME", "X_LANE_GID>X_LANE", "TRANSPORT_MODE_GID>TRANSPORT_MODE", "MIN_WEIGHT#", "MAX_WEIGHT#", "IS_ACTIVE"]],
  ["LEG", "Planning", "LEG", "Itinerary leg", ["LEG_GID", "ITINERARY_GID>ITINERARY", "SOURCE_LOCATION_GID>LOCATION", "DEST_LOCATION_GID>LOCATION", "SERVPROV_GID>SERVPROV", "SEQUENCE_NO#"]],
  ["ORDER_BASE", "Orders", "OB", "Order base (customer order)", ["ORDER_BASE_GID", "SOURCE_LOCATION_GID>LOCATION", "DEST_LOCATION_GID>LOCATION", "EARLY_PICKUP_DATE@", "LATE_DELIVERY_DATE@"]],
  ["ORDER_RELEASE", "Orders", "OR", "Order release", ["ORDER_RELEASE_GID", "ORDER_RELEASE_XID", "ORDER_BASE_GID>ORDER_BASE", "SOURCE_LOCATION_GID>LOCATION", "DEST_LOCATION_GID>LOCATION", "ITINERARY_GID>ITINERARY", "TOTAL_WEIGHT#", "WEIGHT_UOM_CODE>UOM", "EARLY_PICKUP_DATE@", "LATE_DELIVERY_DATE@", "STATUS"]],
  ["ORDER_RELEASE_LINE", "Orders", "ORL", "Order release line", ["ORDER_RELEASE_LINE_GID", "ORDER_RELEASE_GID>ORDER_RELEASE", "PACKAGED_ITEM_GID>PACKAGED_ITEM", "QUANTITY#", "WEIGHT#"]],
  ["ORDER_RELEASE_REFNUM", "Orders", "ORR", "Order release reference number", ["ORDER_RELEASE_GID>ORDER_RELEASE", "ORDER_RELEASE_REFNUM_QUAL_GID", "ORDER_RELEASE_REFNUM_VALUE"], ["ORDER_RELEASE_GID", "ORDER_RELEASE_REFNUM_QUAL_GID"]],
  ["SHIPMENT", "Execution", "SH", "Shipment (planned or tendered)", ["SHIPMENT_GID", "SHIPMENT_XID", "SERVPROV_GID>SERVPROV", "SOURCE_LOCATION_GID>LOCATION", "DEST_LOCATION_GID>LOCATION", "TRANSPORT_MODE_GID>TRANSPORT_MODE", "RATE_OFFERING_GID>RATE_OFFERING", "ITINERARY_GID>ITINERARY", "FIRST_EQUIPMENT_GROUP_GID>EQUIPMENT_GROUP", "TOTAL_ACTUAL_COST#", "CURRENCY_GID>CURRENCY", "START_TIME@", "END_TIME@", "TOTAL_WEIGHT#"]],
  ["SHIPMENT_STOP", "Execution", "SS", "Shipment stop", ["SHIPMENT_GID>SHIPMENT", "STOP_NUM#", "LOCATION_GID>LOCATION", "STOP_TYPE", "PLANNED_ARRIVAL@", "ACTUAL_ARRIVAL@"], ["SHIPMENT_GID", "STOP_NUM"]],
  ["SHIPMENT_REFNUM", "Execution", "SR", "Shipment reference number", ["SHIPMENT_GID>SHIPMENT", "SHIPMENT_REFNUM_QUAL_GID", "SHIPMENT_REFNUM_VALUE"], ["SHIPMENT_GID", "SHIPMENT_REFNUM_QUAL_GID"]],
  ["SHIPMENT_STATUS", "Execution", "SST", "Shipment status", ["SHIPMENT_GID>SHIPMENT", "STATUS_TYPE_GID>STATUS_TYPE", "STATUS_VALUE_GID>STATUS_VALUE"], ["SHIPMENT_GID", "STATUS_TYPE_GID"]],
  ["S_SHIP_UNIT", "Execution", "SSU", "Shipment ship unit", ["S_SHIP_UNIT_GID", "SHIPMENT_GID>SHIPMENT", "ORDER_RELEASE_GID>ORDER_RELEASE", "UNIT_COUNT#", "TOTAL_WEIGHT#"]],
  ["SHIPMENT_COST", "Execution", "SC", "Shipment cost line", ["SHIPMENT_COST_SEQNO#", "SHIPMENT_GID>SHIPMENT", "ACCESSORIAL_CODE_GID>ACCESSORIAL_CODE", "COST#", "CURRENCY_GID>CURRENCY", "COST_TYPE"], ["SHIPMENT_COST_SEQNO"]],
  ["INVOICE", "Settlement", "INV", "Freight invoice", ["INVOICE_GID", "SERVPROV_GID>SERVPROV", "SHIPMENT_GID>SHIPMENT", "NET_AMOUNT_DUE#", "CURRENCY_GID>CURRENCY", "INVOICE_DATE@"]],
  ["SAVED_QUERY", "Automation", "SQ", "Saved query", ["QUERY_NAME", "QUERY_TABLE", "SQL_TEXT"], ["QUERY_NAME"]],
  ["SAVED_CONDITION", "Automation", "SCN", "Saved condition used by agents", ["SAVED_CONDITION_GID", "QUERY_NAME>SAVED_QUERY", "DESCRIPTION"]],
  ["NOTIFY_SUBJECT", "Automation", "NS", "Notification subject", ["NOTIFY_SUBJECT_GID", "DESCRIPTION"]],
  ["AGENT", "Automation", "AG", "Automation agent", ["AGENT_GID", "AGENT_XID", "DESCRIPTION", "DATA_QUERY_TYPE_GID", "IS_ACTIVE", "RESTRICTION"]],
  ["AGENT_EVENT_DETAILS", "Automation", "AED", "Agent trigger events", ["AGENT_GID>AGENT", "AGENT_EVENT_SEQ#", "AGENT_EVENT_GID", "SAVED_CONDITION_GID>SAVED_CONDITION"], ["AGENT_GID", "AGENT_EVENT_SEQ"]],
  ["AGENT_ACTION_DETAILS", "Automation", "AAD", "Agent actions (incl. IF/ELSE blocks)", ["AGENT_GID>AGENT", "ACTION_SEQUENCE#", "PARENT_BLOCK", "AGENT_ACTION_GID", "ACTION_PARAMETERS", "NOTIFY_SUBJECT_GID>NOTIFY_SUBJECT"], ["AGENT_GID", "PARENT_BLOCK", "ACTION_SEQUENCE"]],
];

export const AUDIT_COLS = ["INSERT_USER", "INSERT_DATE", "UPDATE_USER", "UPDATE_DATE"];

function parseCol(c: string): Column {
  if (c.includes(">")) { const [n, t] = c.split(">"); return { name: n, type: "VARCHAR2", fk: t }; }
  if (c.endsWith("#")) return { name: c.slice(0, -1), type: "NUMBER" };
  if (c.endsWith("@")) return { name: c.slice(0, -1), type: "DATE" };
  return { name: c, type: "VARCHAR2" };
}

export const TABLES: Table[] = SPECS.map(([name, category, prefix, description, cols, pk]) => {
  const columns = cols.map(parseCol);
  if (name !== "DOMAIN") columns.push({ name: "DOMAIN_NAME", type: "VARCHAR2", fk: "DOMAIN" });
  columns.push({ name: "INSERT_USER", type: "VARCHAR2", fk: name === "GL_USER" ? undefined : "GL_USER" },
    { name: "INSERT_DATE", type: "DATE" }, { name: "UPDATE_USER", type: "VARCHAR2" }, { name: "UPDATE_DATE", type: "DATE" });
  return { name, category, prefix, description, columns, pk: pk ?? [columns[0].name] };
});

export const TABLE_MAP: Record<string, Table> = Object.fromEntries(TABLES.map((t) => [t.name, t]));

const labelFor = (col: string) => col.replace(/_GID$|_CODE3_GID$|_NAME$/, "").replace(/_/g, " ").toLowerCase();

export const FOREIGN_KEYS: ForeignKey[] = TABLES.flatMap((t) =>
  t.columns.filter((c) => c.fk && TABLE_MAP[c.fk]).map((c) => ({
    from: t.name, fromCol: c.name, to: c.fk!, toCol: TABLE_MAP[c.fk!].pk[0], label: labelFor(c.name),
  })),
);

/** Hubs: tables referenced by very many others. Computed from FK in-degree, plus known reference hubs. */
export function computeHubs(threshold = 8): { table: string; inbound: number }[] {
  const counts: Record<string, number> = {};
  FOREIGN_KEYS.forEach((f) => (counts[f.to] = (counts[f.to] ?? 0) + 1));
  const always = new Set(["DOMAIN", "GL_USER", "UOM", "TIME_ZONE", "CURRENCY", "COUNTRY_CODE"]);
  return Object.entries(counts)
    .filter(([t, n]) => n >= threshold || always.has(t))
    .map(([table, inbound]) => ({ table, inbound }))
    .sort((a, b) => b.inbound - a.inbound);
}
export const DEFAULT_HUBS = computeHubs().map((h) => h.table);
