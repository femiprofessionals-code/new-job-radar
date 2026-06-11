"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/primitives";

/**
 * Submit button that shows a spinner while its parent form's server action
 * runs. Drop-in replacement for Button inside <form>.
 */
export function PendingButton({
  children,
  pendingText,
  variant = "primary",
  size = "md",
  className,
}: {
  children: React.ReactNode;
  pendingText?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} size={size} className={className} disabled={pending}>
      {pending ? (
        <>
          <Loader2 size={14} className="animate-spin" />
          {pendingText ?? "Working…"}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
