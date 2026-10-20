import { handle, requireSession } from "@/lib/api";
export async function GET() { return handle(() => requireSession()); }
