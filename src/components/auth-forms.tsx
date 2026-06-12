"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn, signUp, type AuthState } from "@/app/auth-actions";
import { Button, Input } from "@/components/ui/primitives";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-1 block text-xs font-medium text-ink-muted">{children}</label>;
}

export function LoginForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(signIn, {});
  return (
    <form action={action} className="space-y-3">
      <div>
        <FieldLabel>Email</FieldLabel>
        <Input name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="text-xs font-medium text-ink-muted">Password</label>
          <Link href="/forgot-password" className="text-[11px] text-signal hover:underline">
            Forgot password?
          </Link>
        </div>
        <Input name="password" type="password" required autoComplete="current-password" placeholder="••••••••" />
      </div>
      {state.error && <p className="text-xs text-danger">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-center text-xs text-ink-muted">
        No account?{" "}
        <Link href="/signup" className="text-signal hover:underline">
          Create one free
        </Link>
      </p>
    </form>
  );
}

export function SignupForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(signUp, {});
  return (
    <form action={action} className="space-y-3">
      <div>
        <FieldLabel>Full name</FieldLabel>
        <Input name="name" required autoComplete="name" placeholder="Ada Lovelace" />
      </div>
      <div>
        <FieldLabel>Email</FieldLabel>
        <Input name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
      </div>
      <div>
        <FieldLabel>Password (8+ characters)</FieldLabel>
        <Input name="password" type="password" required minLength={8} autoComplete="new-password" placeholder="••••••••" />
      </div>
      <div>
        <FieldLabel>I&apos;m joining as</FieldLabel>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-edge-strong bg-surface-2 px-3 py-2.5 text-sm has-[:checked]:border-signal/50 has-[:checked]:bg-signal-soft">
            <input type="radio" name="role" value="candidate" defaultChecked className="accent-[var(--color-signal)]" />
            <span>
              <span className="block text-xs font-medium">Job seeker</span>
              <span className="block text-[10px] text-ink-muted">Find interviews faster</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-edge-strong bg-surface-2 px-3 py-2.5 text-sm has-[:checked]:border-violet/50 has-[:checked]:bg-violet-soft">
            <input type="radio" name="role" value="expert" className="accent-[var(--color-violet)]" />
            <span>
              <span className="block text-xs font-medium">Career expert</span>
              <span className="block text-[10px] text-ink-muted">Earn reviewing & coaching</span>
            </span>
          </label>
        </div>
      </div>
      {state.error && <p className="text-xs text-danger">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating account…" : "Create free account"}
      </Button>
      <p className="text-center text-xs text-ink-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-signal hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
