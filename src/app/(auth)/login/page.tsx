import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { LoginForm } from "@/components/auth-forms";
import { Card, CardContent } from "@/components/ui/primitives";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect("/");

  return (
    <Card className="w-full max-w-sm">
      <CardContent className="p-6">
        <h1 className="text-lg font-bold tracking-tight">Welcome back</h1>
        <p className="mb-5 mt-1 text-xs text-ink-muted">Sign in to your career command center.</p>
        <LoginForm />
      </CardContent>
    </Card>
  );
}
