import { requireUser } from "@/lib/session";
import { SidebarNav, MobileNav } from "@/components/shell/nav";
import { Topbar, Brand } from "@/components/shell/topbar";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireUser();

  return (
    <>
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-5 border-r border-edge bg-surface px-3 py-4 md:flex">
          <Brand />
          <SidebarNav persona={user.role} />
        </aside>

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="flex-1 px-4 pb-24 pt-5 md:px-6 md:pb-10">{children}</main>
        </div>
      </div>
      <MobileNav persona={user.role} />
    </>
  );
}
