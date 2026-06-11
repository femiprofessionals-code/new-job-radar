import { Radar } from "lucide-react";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="bg-grid flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="mb-8 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-signal-soft">
          <Radar size={20} className="text-signal" />
        </span>
        <span className="text-xl font-bold tracking-tight">
          Job<span className="text-signal">Radar</span>
        </span>
      </div>
      {children}
      <p className="mt-8 max-w-sm text-center text-[11px] leading-relaxed text-ink-faint">
        The career acceleration platform. Every feature optimizes one outcome: getting you to
        interviews faster.
      </p>
    </div>
  );
}
