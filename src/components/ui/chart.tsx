/** Éléments partagés par les graphiques Recharts (tooltip, axes) adaptés aux thèmes clair et sombre. */

interface TooltipPayload {
  name?: string;
  value?: number | string;
  color?: string;
  payload?: Record<string, unknown> & { fill?: string; label?: string };
}

export function ChartTooltip({
  active,
  payload,
  label,
  unit,
  labelKey,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string | number;
  unit?: string;
  labelKey?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const heading = labelKey ? (payload[0].payload?.[labelKey] as string) : label;
  return (
    <div className="surface-raised rounded-lg px-3 py-2 text-xs min-w-[120px]">
      {heading !== undefined && heading !== '' && <p className="font-medium text-[var(--color-text)] mb-1">{heading}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-muted">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color || p.payload?.fill }} />
          <span className="flex-1">{p.name}</span>
          <span className="font-semibold tabular-nums text-[var(--color-text)]">
            {p.value}
            {unit}
          </span>
        </div>
      ))}
    </div>
  );
}

export const axisProps = {
  tick: { fontSize: 11, fill: 'var(--color-text-secondary)' },
  axisLine: false,
  tickLine: false,
} as const;

export const gridProps = {
  strokeDasharray: '3 3',
  stroke: 'var(--color-border)',
  vertical: false,
} as const;

export function ChartLegend({ items }: { items: { label: string; value: number; color: string }[] }) {
  const total = items.reduce((s, i) => s + i.value, 0);
  return (
    <ul className="space-y-1.5">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: i.color }} />
          <span className="text-muted flex-1 truncate">{i.label}</span>
          <span className="font-medium tabular-nums text-[var(--color-text)]">{i.value}</span>
          <span className="text-muted tabular-nums w-9 text-right">{total ? Math.round((i.value / total) * 100) : 0}%</span>
        </li>
      ))}
    </ul>
  );
}
