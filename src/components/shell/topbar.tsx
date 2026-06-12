import { Bell, LogOut, Radar, Settings } from "lucide-react";
import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getNotifications, getUnreadCount } from "@/lib/data";
import { markAllNotificationsRead } from "@/app/actions";
import { signOut } from "@/app/auth-actions";
import { Avatar, Badge } from "@/components/ui/primitives";
import { timeAgo } from "@/lib/utils";

export function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2 px-1">
      <span className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-signal-soft">
        <Radar size={16} className="text-signal" />
      </span>
      <span className="text-[15px] font-bold tracking-tight">
        Job<span className="text-signal">Radar</span>
      </span>
    </Link>
  );
}

export async function Topbar() {
  const user = await requireUser();
  const [notifications, unread] = await Promise.all([
    getNotifications(user.id),
    getUnreadCount(user.id),
  ]);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-edge bg-canvas/80 px-4 backdrop-blur md:px-6">
      <div className="flex items-center gap-2 md:hidden">
        <Brand />
      </div>
      <div className="hidden items-center gap-2 text-xs text-ink-faint md:flex">
        <span className="inline-block h-1.5 w-1.5 animate-pulse-signal rounded-full bg-signal" />
        Radar active · scanning for interview signal
      </div>

      <div className="flex items-center gap-2">
        {/* Notifications */}
        <details className="relative">
          <summary className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-3 hover:text-ink [&::-webkit-details-marker]:hidden">
            <span className="relative">
              <Bell size={17} />
              {unread > 0 && (
                <span className="absolute -right-1 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-signal px-0.5 text-[9px] font-bold text-black">
                  {unread}
                </span>
              )}
            </span>
          </summary>
          <div className="absolute right-0 top-11 z-50 w-80 rounded-xl border border-edge-strong bg-surface-2 p-2 shadow-2xl">
            <div className="flex items-center justify-between px-2 py-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
                Notifications
              </p>
              {unread > 0 && (
                <form action={markAllNotificationsRead}>
                  <button className="text-[11px] text-signal hover:underline">Mark all read</button>
                </form>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 && (
                <p className="px-2 py-6 text-center text-xs text-ink-faint">All quiet on the radar.</p>
              )}
              {notifications.map((n) => (
                <Link
                  key={n.id}
                  href={n.href ?? "/"}
                  className="block rounded-lg px-2 py-2 hover:bg-surface-3"
                >
                  <div className="flex items-start gap-2">
                    {!n.readAt && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-signal" />}
                    <div className={n.readAt ? "opacity-60" : ""}>
                      <p className="text-xs font-medium text-ink">{n.title}</p>
                      {n.body && <p className="mt-0.5 text-[11px] text-ink-muted">{n.body}</p>}
                      <p className="mt-0.5 text-[10px] text-ink-faint">{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </details>

        {/* Account menu */}
        <details className="relative">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-surface-3 [&::-webkit-details-marker]:hidden">
            <Avatar name={user.name} size={28} />
            <span className="hidden text-sm font-medium md:block">{user.name}</span>
            <Badge
              tone={user.role === "expert" ? "violet" : "signal"}
              className="hidden md:inline-flex"
            >
              {user.role === "expert" ? "Expert" : "Candidate"}
            </Badge>
          </summary>
          <div className="absolute right-0 top-11 z-50 w-64 rounded-xl border border-edge-strong bg-surface-2 p-2 shadow-2xl">
            <div className="flex items-center gap-2 px-2 py-2">
              <Avatar name={user.name} size={32} />
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-ink">{user.name}</p>
                <p className="truncate text-[11px] text-ink-muted">{user.email}</p>
              </div>
            </div>

            <div className="border-t border-edge pt-1">
              <Link
                href="/settings"
                className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs text-ink-muted hover:bg-surface-3 hover:text-ink"
              >
                <Settings size={13} /> Settings & profile
              </Link>
              <form action={signOut}>
                <button className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs text-ink-muted hover:bg-danger-soft hover:text-danger">
                  <LogOut size={13} /> Sign out
                </button>
              </form>
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}
