'use client';

import { useState } from 'react';

/** Vertical bars with a hover/focus readout. Accessible as a list of labelled values. */
export function BarChart({
  data,
  height = 160,
  color = 'var(--color-primary)',
  formatLabel,
}: {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  formatLabel: (label: string) => string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const current = active == null ? null : data[active];

  return (
    <div>
      <div className="mb-2 h-5 text-xs text-muted" aria-live="polite">
        {current ? (
          <>
            <span className="font-semibold text-fg">{current.value}</span> · {formatLabel(current.label)}
          </>
        ) : null}
      </div>
      <ul className="flex items-end gap-1.5" style={{ height }} onMouseLeave={() => setActive(null)}>
        {data.map((d, i) => (
          <li key={d.label} className="flex h-full flex-1 flex-col justify-end">
            <button
              type="button"
              aria-label={`${formatLabel(d.label)}: ${d.value}`}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              className="w-full rounded-t-[4px] transition-opacity"
              style={{
                height: `${Math.max(d.value === 0 ? 2 : 6, (d.value / max) * 100)}%`,
                background: d.value === 0 ? 'var(--color-border)' : color,
                opacity: active == null || active === i ? 1 : 0.45,
              }}
            />
          </li>
        ))}
      </ul>
      <div className="mt-2 flex justify-between text-[11px] text-subtle">
        <span>{data[0] && formatLabel(data[0].label)}</span>
        <span>{data.at(-1) && formatLabel(data.at(-1)!.label)}</span>
      </div>
    </div>
  );
}

/** Horizontal bars: one row per item, value at the end. */
export function HBarList({
  data,
  total,
}: {
  data: { label: string; value: number; color?: string }[];
  /** Bars are drawn relative to this. Defaults to the largest value. */
  total?: number;
}) {
  const max = Math.max(1, total ?? Math.max(0, ...data.map((d) => d.value)));
  return (
    <ul className="flex flex-col gap-3">
      {data.map((d) => (
        <li key={d.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-fg">{d.label}</span>
            <span className="font-semibold tabular-nums">{d.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full"
              style={{ width: `${(d.value / max) * 100}%`, background: d.color ?? 'var(--color-primary)' }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
