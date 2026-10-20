import { handle, requireSuperAdmin } from "@/lib/api";
import { resetStore } from "@/lib/store";
export async function POST() {
  return handle(async () => { await requireSuperAdmin(); resetStore(); return { ok: true }; });
}
