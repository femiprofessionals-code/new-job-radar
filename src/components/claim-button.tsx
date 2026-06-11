"use client";

import { useState, useTransition } from "react";
import { Lock } from "lucide-react";
import { claimReview } from "@/app/actions";
import { Button } from "@/components/ui/primitives";

export function ClaimButton({ reviewRequestId }: { reviewRequestId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await claimReview(reviewRequestId);
            if (!res.ok) setError(res.reason ?? "Claim failed");
          })
        }
      >
        <Lock size={12} /> {pending ? "Claiming…" : "Claim review"}
      </Button>
      {error && <p className="text-[10px] text-danger">{error}</p>}
    </div>
  );
}
