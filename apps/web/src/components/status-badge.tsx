'use client';

import type { ApplicationStatus } from '@jobflow/shared';
import { useT } from '@/lib/i18n';

export const STATUS_COLOR: Record<ApplicationStatus, string> = {
  WISHLIST: 'var(--color-status-wishlist)',
  APPLIED: 'var(--color-status-applied)',
  SCREENING: 'var(--color-status-screening)',
  INTERVIEWING: 'var(--color-status-interviewing)',
  OFFER: 'var(--color-status-offer)',
  ACCEPTED: 'var(--color-status-accepted)',
  REJECTED: 'var(--color-status-rejected)',
  WITHDRAWN: 'var(--color-status-withdrawn)',
};

export function StatusDot({ status }: { status: ApplicationStatus }) {
  return <span className="inline-block size-2 shrink-0 rounded-full" style={{ background: STATUS_COLOR[status] }} />;
}

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  const t = useT();
  const color = STATUS_COLOR[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap"
      style={{ color, background: `color-mix(in srgb, ${color} 14%, transparent)` }}
    >
      <StatusDot status={status} />
      {t(`status.${status}`)}
    </span>
  );
}
