'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useNotifications } from '@/lib/queries';
import { useI18n } from '@/lib/i18n';
import { formatRelative } from '@/lib/format';
import { IconBell } from './icons';

const KIND_COLOR = {
  INTERVIEW_SOON: 'var(--color-status-interviewing)',
  OFFER_DEADLINE: 'var(--color-status-offer)',
  FOLLOW_UP: 'var(--color-status-applied)',
} as const;

export function NotificationsBell() {
  const { t, locale } = useI18n();
  const { data = [] } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`${t('notifications.title')} (${data.length})`}
        className="relative grid size-9 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg"
      >
        <IconBell className="size-5" />
        {data.length > 0 && (
          <span className="absolute top-1 right-1 grid min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {data.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-surface shadow-xl">
          <div className="border-b border-border px-4 py-3 text-sm font-semibold">{t('notifications.title')}</div>
          {data.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted">{t('notifications.empty')}</p>
          ) : (
            <ul className="max-h-96 divide-y divide-border overflow-y-auto">
              {data.map((n) => (
                <li key={n.id}>
                  <Link
                    href={`/applications/${n.applicationId}`}
                    onClick={() => setOpen(false)}
                    className="flex gap-3 px-4 py-3 hover:bg-surface-2"
                  >
                    <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: KIND_COLOR[n.kind] }} />
                    <span className="min-w-0">
                      <span className="block text-xs font-medium text-muted">{t(`notifications.${n.kind}`)}</span>
                      <span className="block truncate text-sm font-medium text-fg">
                        {n.title} · {n.company}
                      </span>
                      <span className="block text-xs text-subtle">{formatRelative(n.date, locale)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
