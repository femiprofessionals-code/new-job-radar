"use client";

import { useTransition } from "react";
import { moveApplicationStage } from "@/app/actions";
import type { ApplicationStage } from "@/db/schema";
import { cn } from "@/lib/utils";
import { STAGES } from "@/lib/stages";

export function StageSelect({
  applicationId,
  stage,
  className,
}: {
  applicationId: string;
  stage: ApplicationStage;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <select
      value={stage}
      disabled={pending}
      onChange={(e) =>
        startTransition(() =>
          moveApplicationStage(applicationId, e.target.value as ApplicationStage)
        )
      }
      className={cn(
        "h-7 cursor-pointer rounded-md border border-edge-strong bg-surface-3 px-1.5 text-[11px] text-ink disabled:opacity-50",
        className
      )}
      aria-label="Application stage"
    >
      {STAGES.map((s) => (
        <option key={s.id} value={s.id}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
