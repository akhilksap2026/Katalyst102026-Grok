import { handle, requireFeature } from "@/lib/api";
import { TABLES, FOREIGN_KEYS, computeHubs } from "@/lib/otm/dictionary";
export async function GET() {
  return handle(async () => { await requireFeature("dictionary"); return { tables: TABLES, fks: FOREIGN_KEYS, hubs: computeHubs() }; });
}
