"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset, resetPassword, type AuthState } from "@/app/auth-actions";
import { Button, Input } from "@/components/ui/primitives";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<AuthState & { sent?: boolean }, FormData>(
    requestPasswordReset,
    {}
  );

  if (state.sent) {
    return (
      <div className="space-y-3 text-center">
        <p className="text-sm text-ink">Check your inbox 📬</p>
        <p className="text-xs leading-relaxed text-ink-muted">
          If an account exists for that email, we&apos;ve sent a reset link. It&apos;s valid for one
          hour.
        </p>
        <Link href="/login" className="inline-block text-xs text-signal hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-ink-muted">Email</label>
        <Input name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
      </div>
      {state.error && <p className="text-xs text-danger">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </Button>
      <p className="text-center text-xs text-ink-muted">
        Remembered it?{" "}
        <Link href="/login" className="text-signal hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(resetPassword, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="token" value={token} />
      <div>
        <label className="mb-1 block text-xs font-medium text-ink-muted">
          New password (8+ characters)
        </label>
        <Input name="password" type="password" required minLength={8} autoComplete="new-password" placeholder="••••••••" />
      </div>
      {state.error && <p className="text-xs text-danger">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Set new password"}
      </Button>
    </form>
  );
}
