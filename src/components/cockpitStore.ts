export interface SavedQuery { id: number; name: string; sql: string; savedAt: string; tags: string[] }
export const cockpitKey = (tenantId: string) => `katalyst:cockpit:${tenantId}`;
export function loadQueries(tenantId: string): SavedQuery[] { try { return JSON.parse(localStorage.getItem(cockpitKey(tenantId)) ?? "[]"); } catch { return []; } }
export function storeQueries(tenantId: string, q: SavedQuery[]) { localStorage.setItem(cockpitKey(tenantId), JSON.stringify(q)); }
export function saveToCockpit(name: string, sql: string, tenantId: string) {
  storeQueries(tenantId, [{ id: Date.now(), name, sql, savedAt: new Date().toISOString(), tags: [] }, ...loadQueries(tenantId)]);
}
