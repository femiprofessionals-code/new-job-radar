import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { LoginForm } from "@/components/auth-forms";
import { Card, CardContent } from "@/components/ui/primitives";

export const metadata = { title: "Sign in" };

export default async function LoginPage(props: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const { reset } = await props.searchParams;
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <Card className="w-full max-w-sm">
      <CardContent className="p-6">
        <h1 className="text-lg font-bold tracking-tight">Welcome back</h1>
        <p className="mb-5 mt-1 text-xs text-ink-muted">Sign in to your career command center.</p>
        {reset === "1" && (
          <p className="mb-4 rounded-lg border border-signal/30 bg-signal-soft px-3 py-2 text-xs text-signal">
            Password updated — sign in with your new password.
          </p>
        )}
        <LoginForm />
      </CardContent>
    </Card>
  );
}
