import type { TrendPoint } from "@/services/dashboard.service";

export function TrendChart({ data, label }: { data: TrendPoint[]; label: string }) {
  const maximum = Math.max(1, ...data.map((point) => point.count));
  return (
    <div>
      <div className="flex h-40 items-end gap-1" aria-label={label}>
        {data.map((point) => (
          <div className="group relative flex h-full min-w-0 flex-1 items-end" key={point.date}>
            <div
              className="w-full bg-primary/75 transition-colors group-hover:bg-primary"
              style={{ height: `${Math.max(point.count > 0 ? 6 : 2, (point.count / maximum) * 100)}%` }}
            />
            <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-2 py-1 text-xs text-background group-hover:block">
              {point.date}: {point.count}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>{data[0]?.date.slice(5)}</span>
        <span>{data[data.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}

