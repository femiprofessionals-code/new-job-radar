import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { SignupForm } from "@/components/auth-forms";
import { Card, CardContent } from "@/components/ui/primitives";

export const metadata = { title: "Create account" };

export default async function SignupPage() {
  const user = await getSessionUser();
  if (user && !user.isDemo) redirect("/");

  return (
    <Card className="w-full max-w-sm">
      <CardContent className="p-6">
        <h1 className="text-lg font-bold tracking-tight">Create your account</h1>
        <p className="mb-5 mt-1 text-xs text-ink-muted">
          Free to start. Your radar goes live in under two minutes.
        </p>
        <SignupForm />
      </CardContent>
    </Card>
  );
}
