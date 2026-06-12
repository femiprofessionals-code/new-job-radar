import Link from "next/link";
import { ResetPasswordForm } from "@/components/reset-forms";
import { Card, CardContent } from "@/components/ui/primitives";

export const metadata = { title: "Reset password" };

export default async function ResetPasswordPage(props: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await props.searchParams;

  return (
    <Card className="w-full max-w-sm">
      <CardContent className="p-6">
        <h1 className="text-lg font-bold tracking-tight">Choose a new password</h1>
        <p className="mb-5 mt-1 text-xs text-ink-muted">
          This signs you out everywhere — sign back in with the new password.
        </p>
        {token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <p className="text-xs text-danger">
            Missing reset token — use the link from your email, or{" "}
            <Link href="/forgot-password" className="text-signal hover:underline">
              request a new one
            </Link>
            .
          </p>
        )}
      </CardContent>
    </Card>
  );
}
