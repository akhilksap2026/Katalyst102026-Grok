import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { SessionProvider } from "@/components/session";
import { Shell } from "@/components/Shell";
import { ToastProvider } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await getSession();
  if (!s) redirect("/login");
  return <SessionProvider value={s}><ToastProvider><Shell>{children}</Shell></ToastProvider></SessionProvider>;
}
