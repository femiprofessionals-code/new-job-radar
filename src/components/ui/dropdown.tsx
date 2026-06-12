"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Dropdown that closes on outside click, Escape, and after any click inside
 * the panel (links / form buttons still fire first).
 */
export function Dropdown({
  trigger,
  children,
  panelClassName,
  triggerClassName,
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  panelClassName?: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn("cursor-pointer", triggerClassName)}
      >
        {trigger}
      </button>
      {open && (
        <div
          className={cn(
            "absolute right-0 top-11 z-50 rounded-xl border border-edge-strong bg-surface-2 p-2 shadow-2xl",
            panelClassName
          )}
          onClick={(e) => {
            // Close after link navigation (Link's router.push has already run
            // by the time this bubbles). Form buttons must NOT close here —
            // unmounting the form mid-click cancels its submission.
            const el = e.target as HTMLElement;
            if (el.closest("a")) setOpen(false);
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
