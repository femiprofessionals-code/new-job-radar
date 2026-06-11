"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Radar,
  KanbanSquare,
  Users,
  MessagesSquare,
  BarChart3,
  Settings,
  Sparkles,
  Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";

const CANDIDATE_NAV = [
  { href: "/", label: "Home", icon: Home },
  { href: "/opportunities", label: "Opportunities", icon: Radar },
  { href: "/applications", label: "Applications", icon: KanbanSquare },
  { href: "/experts", label: "Experts", icon: Users },
  { href: "/interviews", label: "Interviews", icon: MessagesSquare },
  { href: "/insights", label: "Insights", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

const EXPERT_NAV = [
  { href: "/experts/queue", label: "Review Queue", icon: Inbox },
  { href: "/experts", label: "Marketplace", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/experts") return pathname === "/experts" || (pathname.startsWith("/experts/") && !pathname.startsWith("/experts/queue"));
  return pathname === href || pathname.startsWith(href + "/");
}

export function SidebarNav({ persona }: { persona: "candidate" | "expert" }) {
  const pathname = usePathname();
  const nav = persona === "expert" ? EXPERT_NAV : CANDIDATE_NAV;
  return (
    <nav className="flex flex-col gap-0.5" aria-label="Primary">
      {persona === "candidate" && (
        <Link
          href="/copilot"
          className={cn(
            "mb-3 flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
            pathname.startsWith("/copilot")
              ? "border-signal/40 bg-signal-soft text-signal"
              : "border-edge-strong bg-surface-2 text-ink hover:border-signal/30 hover:text-signal"
          )}
        >
          <Sparkles size={16} />
          Career Copilot
        </Link>
      )}
      {nav.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
              active
                ? "bg-surface-3 font-medium text-ink"
                : "text-ink-muted hover:bg-surface-2 hover:text-ink"
            )}
          >
            <item.icon size={16} className={active ? "text-signal" : ""} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNav({ persona }: { persona: "candidate" | "expert" }) {
  const pathname = usePathname();
  const nav =
    persona === "expert"
      ? EXPERT_NAV
      : [
          CANDIDATE_NAV[0],
          CANDIDATE_NAV[1],
          CANDIDATE_NAV[2],
          { href: "/copilot", label: "Copilot", icon: Sparkles },
          CANDIDATE_NAV[4],
        ];
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-edge bg-surface/95 backdrop-blur md:hidden"
      aria-label="Primary mobile"
    >
      {nav.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px]",
              active ? "text-signal" : "text-ink-muted"
            )}
          >
            <item.icon size={18} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
