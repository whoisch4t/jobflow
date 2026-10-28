'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { useState } from 'react';
import { useInterviews } from '@/lib/queries';
import { useI18n } from '@/lib/i18n';
import { formatDateTime, formatRelative } from '@/lib/format';
import { Card, EmptyState, ErrorBlock, LoadingBlock, PageHeader } from '@/components/ui';

export default function InterviewsPage() {
  const { t, locale } = useI18n();
  const [range, setRange] = useState<'upcoming' | 'past'>('upcoming');
  const { data, isPending, isError, refetch } = useInterviews(range);

  return (
    <>
      <PageHeader
        title={t('interviews.title')}
        actions={
          <div className="inline-flex rounded-lg border border-border bg-surface p-0.5" role="group">
            {(['upcoming', 'past'] as const).map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={range === r}
                onClick={() => setRange(r)}
                className={clsx(
                  'rounded-md px-3 py-1.5 text-sm font-medium',
                  range === r ? 'bg-primary-soft text-primary' : 'text-muted hover:text-fg',
                )}
              >
                {t(`interviews.${r}`)}
              </button>
            ))}
          </div>
        }
      />
      {isPending ? (
        <LoadingBlock label={t('common.loading')} />
      ) : isError ? (
        <ErrorBlock message={t('common.error')} onRetry={() => refetch()} retryLabel={t('common.retry')} />
      ) : data.length === 0 ? (
        <Card>
          <EmptyState title={t('interviews.empty')} />
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-border">
            {data.map((i) => (
              <li key={i.id}>
                <Link
                  href={`/applications/${i.application.id}`}
                  className="flex flex-col gap-1 px-5 py-4 hover:bg-surface-2 sm:flex-row sm:items-center sm:gap-6"
                >
                  <div className="sm:w-56">
                    <p className="text-sm font-semibold">{formatDateTime(i.scheduledAt, locale)}</p>
                    <p className="text-xs text-muted">{formatRelative(i.scheduledAt, locale)}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {i.application.title} · {i.application.company.name}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {t(`interviewType.${i.type}`)}
                      {i.interviewer ? ` · ${i.interviewer}` : ''}
                      {i.location ? ` · ${i.location}` : ''}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-muted">{t(`outcome.${i.outcome}`)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
