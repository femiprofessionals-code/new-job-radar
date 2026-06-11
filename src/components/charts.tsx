"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const TOOLTIP_STYLE = {
  background: "var(--color-surface-2)",
  border: "1px solid var(--color-edge-strong)",
  borderRadius: 10,
  fontSize: 12,
  color: "var(--color-ink)",
};

export function TrendChart({
  data,
  dataKey,
  color = "var(--color-signal)",
  height = 180,
  secondaryKey,
  secondaryColor = "var(--color-info)",
}: {
  data: Record<string, string | number>[];
  dataKey: string;
  color?: string;
  height?: number;
  secondaryKey?: string;
  secondaryColor?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -22 }}>
        <defs>
          <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--color-edge)" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: "var(--color-ink-faint)", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "var(--color-ink-faint)", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          domain={[0, 100]}
        />
        <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: "var(--color-edge-strong)" }} />
        {secondaryKey && (
          <Area
            type="monotone"
            dataKey={secondaryKey}
            stroke={secondaryColor}
            strokeWidth={1.5}
            strokeDasharray="4 3"
            fill="none"
          />
        )}
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          fill={`url(#grad-${dataKey})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function FunnelChart({
  data,
  height = 220,
}: {
  data: { label: string; value: number }[];
  height?: number;
}) {
  const colors = [
    "var(--color-ink-faint)",
    "var(--color-info)",
    "var(--color-violet)",
    "var(--color-warn)",
    "var(--color-signal)",
  ];
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -28 }}>
        <CartesianGrid stroke="var(--color-edge)" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: "var(--color-ink-faint)", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "var(--color-ink-faint)", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--color-surface-3)", opacity: 0.4 }} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={48}>
          {data.map((_, i) => (
            <Cell key={i} fill={colors[Math.min(i, colors.length - 1)]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
