import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn, initials } from "@/lib/utils";

/* ── Button ── */

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        primary: "bg-signal text-black hover:bg-signal/85",
        secondary: "bg-surface-3 text-ink border border-edge-strong hover:bg-overlay",
        ghost: "text-ink-muted hover:text-ink hover:bg-surface-3",
        danger: "bg-danger-soft text-danger border border-danger/30 hover:bg-danger/20",
        outline: "border border-edge-strong text-ink hover:bg-surface-3",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-9 px-4",
        lg: "h-11 px-6 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export function Button({
  className,
  variant,
  size,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

/* ── Card ── */

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-xl border border-edge bg-surface", className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-start justify-between gap-2 p-4 pb-2", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-sm font-semibold text-ink", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4 pt-2", className)} {...props} />;
}

/* ── Badge ── */

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium leading-4",
  {
    variants: {
      tone: {
        signal: "bg-signal-soft text-signal",
        info: "bg-info-soft text-info",
        warn: "bg-warn-soft text-warn",
        danger: "bg-danger-soft text-danger",
        violet: "bg-violet-soft text-violet",
        neutral: "bg-surface-3 text-ink-muted",
        outline: "border border-edge-strong text-ink-muted",
      },
    },
    defaultVariants: { tone: "neutral" },
  }
);

export function Badge({
  className,
  tone,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

/* ── Progress ── */

export function Progress({
  value,
  tone = "signal",
  className,
}: {
  value: number;
  tone?: "signal" | "info" | "warn" | "danger" | "violet";
  className?: string;
}) {
  const colors: Record<string, string> = {
    signal: "bg-signal",
    info: "bg-info",
    warn: "bg-warn",
    danger: "bg-danger",
    violet: "bg-violet",
  };
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-3", className)}>
      <div
        className={cn("h-full rounded-full transition-all", colors[tone])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

/* ── Inputs ── */

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-9 w-full rounded-lg border border-edge-strong bg-surface-2 px-3 text-sm text-ink placeholder:text-ink-faint focus:border-signal/50",
        className
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-lg border border-edge-strong bg-surface-2 p-3 text-sm text-ink placeholder:text-ink-faint focus:border-signal/50",
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-9 rounded-lg border border-edge-strong bg-surface-2 px-3 text-sm text-ink focus:border-signal/50",
        className
      )}
      {...props}
    />
  );
}

/* ── Separator ── */

export function Separator({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-edge", className)} />;
}

/* ── Avatar ── */

const AVATAR_HUES = [160, 210, 260, 30, 330, 190, 90];

export function Avatar({
  name,
  size = 36,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const hue = AVATAR_HUES[name.length % AVATAR_HUES.length];
  return (
    <div
      className={cn("flex shrink-0 items-center justify-center rounded-full font-semibold", className)}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: `hsl(${hue} 40% 18%)`,
        color: `hsl(${hue} 75% 70%)`,
      }}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}

/* ── Company mark ── */

export function CompanyMark({ company, size = 36 }: { company: string; size?: number }) {
  const hue = (company.charCodeAt(0) * 17 + company.length * 31) % 360;
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-lg font-bold"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: `hsl(${hue} 35% 16%)`,
        color: `hsl(${hue} 70% 68%)`,
      }}
      aria-hidden
    >
      {company[0]}
    </div>
  );
}

/* ── Score ring ── */

export function ScoreRing({
  value,
  size = 96,
  stroke = 7,
  label,
  tone,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  tone?: "signal" | "info" | "warn" | "danger";
}) {
  const t = tone ?? (value >= 75 ? "signal" : value >= 55 ? "info" : value >= 35 ? "warn" : "danger");
  const colors: Record<string, string> = {
    signal: "var(--color-signal)",
    info: "var(--color-info)",
    warn: "var(--color-warn)",
    danger: "var(--color-danger)",
  };
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-surface-3)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={colors[t]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(100, value) / 100)}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="tabular text-xl font-bold leading-none">{Math.round(value)}</span>
        {label && <span className="mt-0.5 text-[10px] text-ink-faint">{label}</span>}
      </div>
    </div>
  );
}

/* ── Stat ── */

export function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "signal" | "info" | "warn" | "danger";
}) {
  const toneCls =
    tone === "signal"
      ? "text-signal"
      : tone === "info"
        ? "text-info"
        : tone === "warn"
          ? "text-warn"
          : tone === "danger"
            ? "text-danger"
            : "text-ink";
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wider text-ink-faint">{label}</span>
      <span className={cn("tabular text-2xl font-bold leading-none", toneCls)}>{value}</span>
      {sub && <span className="text-xs text-ink-muted">{sub}</span>}
    </div>
  );
}

/* ── Empty state ── */

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-edge-strong p-10 text-center">
      {icon && <div className="text-ink-faint">{icon}</div>}
      <p className="text-sm font-medium text-ink">{title}</p>
      {description && <p className="max-w-sm text-xs text-ink-muted">{description}</p>}
      {action}
    </div>
  );
}
