import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { enterDemo } from "@/app/auth-actions";
import { LoginForm } from "@/components/auth-forms";
import { Card, CardContent, Separator } from "@/components/ui/primitives";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user && !user.isDemo) redirect("/");

  return (
    <Card className="w-full max-w-sm">
      <CardContent className="p-6">
        <h1 className="text-lg font-bold tracking-tight">Welcome back</h1>
        <p className="mb-5 mt-1 text-xs text-ink-muted">Sign in to your career command center.</p>
        <LoginForm />
        <Separator className="my-5" />
        <p className="mb-2 text-center text-[11px] uppercase tracking-wider text-ink-faint">
          Or explore the demo
        </p>
        <div className="grid grid-cols-2 gap-2">
          <form action={enterDemo.bind(null, "candidate")}>
            <button className="w-full rounded-lg border border-edge-strong bg-surface-2 px-3 py-2 text-xs text-ink-muted transition-colors hover:border-signal/40 hover:text-ink">
              Candidate demo
              <span className="block text-[10px] text-ink-faint">Alex Morgan</span>
            </button>
          </form>
          <form action={enterDemo.bind(null, "expert")}>
            <button className="w-full rounded-lg border border-edge-strong bg-surface-2 px-3 py-2 text-xs text-ink-muted transition-colors hover:border-violet/40 hover:text-ink">
              Expert demo
              <span className="block text-[10px] text-ink-faint">Sarah Chen</span>
            </button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
