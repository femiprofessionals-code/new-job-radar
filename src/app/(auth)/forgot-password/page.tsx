import { ForgotPasswordForm } from "@/components/reset-forms";
import { Card, CardContent } from "@/components/ui/primitives";

export const metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <Card className="w-full max-w-sm">
      <CardContent className="p-6">
        <h1 className="text-lg font-bold tracking-tight">Forgot your password?</h1>
        <p className="mb-5 mt-1 text-xs text-ink-muted">
          We&apos;ll email you a one-time link to choose a new one.
        </p>
        <ForgotPasswordForm />
      </CardContent>
    </Card>
  );
}
