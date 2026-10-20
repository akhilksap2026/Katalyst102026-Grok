import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Katalyst — OTM Consultant OS", description: "Demo prototype" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
