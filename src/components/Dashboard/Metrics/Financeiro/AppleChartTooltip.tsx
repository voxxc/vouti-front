import type { TooltipProps } from "recharts";

/**
 * Apple-style tooltip for Recharts: glass surface, rounded-xl, refined shadow.
 * Pass `valueFormatter` to format numbers (e.g. currency).
 */
interface AppleChartTooltipProps extends TooltipProps<number, string> {
  valueFormatter?: (value: number) => string;
}

export function AppleChartTooltip({
  active,
  payload,
  label,
  valueFormatter,
}: AppleChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div
      className="rounded-xl border border-border/60 bg-popover/95 px-3 py-2 text-xs"
      style={{
        backdropFilter: "saturate(180%) blur(12px)",
        WebkitBackdropFilter: "saturate(180%) blur(12px)",
        boxShadow: "var(--shadow-apple-md)",
      }}
    >
      {label !== undefined && label !== "" && (
        <div className="text-[11px] font-medium text-muted-foreground mb-1">
          {label}
        </div>
      )}
      <div className="space-y-0.5">
        {payload.map((entry, i) => {
          const value = typeof entry.value === "number" ? entry.value : Number(entry.value ?? 0);
          const formatted = valueFormatter ? valueFormatter(value) : value.toLocaleString("pt-BR");
          return (
            <div key={i} className="flex items-center gap-2">
              <span
                className="inline-block w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-foreground/80">{entry.name}</span>
              <span className="ml-auto font-medium text-foreground tabular-nums">
                {formatted}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
