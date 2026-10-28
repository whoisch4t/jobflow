'use client';

import Link from 'next/link';
import { APPLICATION_STATUSES } from '@jobflow/shared';
import { useAnalytics, useApplications, useInterviews, useMe } from '@/lib/queries';
import { useI18n } from '@/lib/i18n';
import { formatDate, formatDateTime, percent } from '@/lib/format';
import { BarChart, HBarList } from '@/components/charts';
import { StatusBadge, STATUS_COLOR } from '@/components/status-badge';
import { ButtonLink, Card, CardHeader, EmptyState, ErrorBlock, LoadingBlock, PageHeader } from '@/components/ui';
import { IconPlus } from '@/components/icons';

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-subtle">{sub}</p>}
    </Card>
  );
}

export default function DashboardPage() {
  const { t, locale } = useI18n();
  const me = useMe();
  const analytics = useAnalytics();
  const recent = useApplications({ sort: 'updated', order: 'desc', pageSize: 6 });
  const upcoming = useInterviews('upcoming');

  const newButton = (
    <ButtonLink href="/applications/new">
      <IconPlus /> {t('applications.new')}
    </ButtonLink>
  );

  if (analytics.isPending) return <LoadingBlock label={t('common.loading')} />;
  if (analytics.isError)
    return (
      <ErrorBlock message={t('common.error')} onRetry={() => analytics.refetch()} retryLabel={t('common.retry')} />
    );

  const a = analytics.data;
  const header = (
    <PageHeader
      title={t('dashboard.title')}
      subtitle={me.data ? t('dashboard.welcome', { name: me.data.name.split(' ')[0] ?? '' }) : undefined}
      actions={newButton}
    />
  );

  if (a.totals.applications === 0) {
    return (
      <>
        {header}
        <Card>
          <EmptyState title={t('dashboard.empty')} action={newButton} />
        </Card>
      </>
    );
  }

  const weekLabel = (iso: string) => formatDate(iso, locale);
  const funnelStart = a.funnel[0]?.count ?? 0;

  return (
    <>
      {header}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label={t('dashboard.totalApplications')} value={a.totals.applications} />
        <Stat label={t('dashboard.active')} value={a.totals.active} />
        <Stat
          label={t('dashboard.responseRate')}
          value={percent(a.rates.response)}
          sub={t('dashboard.ofSubmitted', { n: a.totals.applied })}
        />
        <Stat label={t('dashboard.interviewRate')} value={percent(a.rates.interview)} />
        <Stat label={t('dashboard.offerRate')} value={percent(a.rates.offer)} />
        <Stat label={t('dashboard.avgResponse')} value={a.avgDaysToFirstResponse ?? '—'} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title={t('dashboard.weekly')} />
          <div className="p-5">
            <BarChart data={a.weekly.map((w) => ({ label: w.weekStart, value: w.count }))} formatLabel={weekLabel} />
          </div>
        </Card>

        <Card>
          <CardHeader title={t('dashboard.funnel')} hint={t('dashboard.funnelHint')} />
          <div className="p-5">
            <HBarList
              total={funnelStart}
              data={a.funnel.map((f) => ({
                label: t(`status.${f.stage}`),
                value: f.count,
                color: STATUS_COLOR[f.stage],
              }))}
            />
          </div>
        </Card>

        <Card>
          <CardHeader title={t('dashboard.byStatus')} />
          <div className="p-5">
            <HBarList
              data={APPLICATION_STATUSES.filter((s) => a.byStatus[s] > 0).map((s) => ({
                label: t(`status.${s}`),
                value: a.byStatus[s],
                color: STATUS_COLOR[s],
              }))}
            />
          </div>
        </Card>

        <Card>
          <CardHeader title={t('dashboard.bySource')} />
          <div className="p-5">
            <HBarList data={a.bySource.map((s) => ({ label: s.source, value: s.count }))} />
          </div>
        </Card>

        <Card>
          <CardHeader
            title={t('dashboard.upcoming')}
            action={
              <Link href="/interviews" className="text-xs font-medium text-primary hover:underline">
                {t('common.all')}
              </Link>
            }
          />
          {upcoming.data?.length ? (
            <ul className="divide-y divide-border">
              {upcoming.data.slice(0, 4).map((i) => (
                <li key={i.id}>
                  <Link href={`/applications/${i.application.id}`} className="block px-5 py-3 hover:bg-surface-2">
                    <p className="text-sm font-medium">{formatDateTime(i.scheduledAt, locale)}</p>
                    <p className="truncate text-xs text-muted">
                      {t(`interviewType.${i.type}`)} · {i.application.company.name}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-8 text-center text-sm text-muted">{t('interviews.empty')}</p>
          )}
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader
          title={t('dashboard.recent')}
          action={
            <Link href="/applications" className="text-xs font-medium text-primary hover:underline">
              {t('common.all')}
            </Link>
          }
        />
        <ul className="divide-y divide-border">
          {recent.data?.items.map((app) => (
            <li key={app.id}>
              <Link
                href={`/applications/${app.id}`}
                className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-surface-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{app.title}</p>
                  <p className="truncate text-xs text-muted">
                    {app.company.name} · {formatDate(app.updatedAt, locale)}
                  </p>
                </div>
                <StatusBadge status={app.status} />
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
