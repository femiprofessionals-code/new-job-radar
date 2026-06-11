import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getSessionUser } from "@/lib/session";
import { SidebarNav, MobileNav } from "@/components/shell/nav";
import { Topbar, Brand } from "@/components/shell/topbar";
import { Badge } from "@/components/ui/primitives";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Job Radar — Career Acceleration Platform", template: "%s · Job Radar" },
  description:
    "The AI + human career acceleration platform that systematically increases your probability of getting interviews.",
};

export const viewport: Viewport = {
  themeColor: "#0a0a0f",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getSessionUser();

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <div className="flex min-h-screen">
          {/* Sidebar */}
          <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-5 border-r border-edge bg-surface px-3 py-4 md:flex">
            <Brand />
            <SidebarNav persona={user.role} />
            <div className="mt-auto rounded-xl border border-edge bg-surface-2 p-3">
              <div className="flex items-center gap-1.5">
                <Badge tone="warn">Demo mode</Badge>
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-ink-faint">
                Running on embedded Postgres with seeded data. Add keys in Settings → Integrations to go
                live.
              </p>
            </div>
          </aside>

          {/* Main */}
          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar />
            <main className="flex-1 px-4 pb-24 pt-5 md:px-6 md:pb-10">{children}</main>
          </div>
        </div>
        <MobileNav persona={user.role} />
      </body>
    </html>
  );
}
