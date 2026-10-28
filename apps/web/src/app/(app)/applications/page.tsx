'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, type DragEvent } from 'react';
import {
  APPLICATION_SORTS,
  APPLICATION_STATUSES,
  WORK_MODES,
  type ApplicationStatus,
  type ApplicationSummary,
} from '@jobflow/shared';
import { useApplications, useMoveApplication, type ApplicationQuery } from '@/lib/queries';
import { useI18n } from '@/lib/i18n';
import { formatDate, formatSalaryRange } from '@/lib/format';
import { StatusBadge, StatusDot, STATUS_COLOR } from '@/components/status-badge';
import {
  Button,
  ButtonLink,
  Card,
  EmptyState,
  ErrorBlock,
  Input,
  LoadingBlock,
  PageHeader,
  Select,
} from '@/components/ui';
import { IconPlus, IconSearch } from '@/components/icons';

type View = 'list' | 'board';

/** Filters live in the URL so they survive reloads and can be shared. */
function useFilters() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters = {
    q: params.get('q') ?? '',
    status: (params.get('status')?.split(',').filter(Boolean) ?? []) as ApplicationStatus[],
    workMode: params.get('workMode') ?? '',
    sort: params.get('sort') ?? 'updated',
    page: Number(params.get('page') ?? 1) || 1,
    view: (params.get('view') === 'board' ? 'board' : 'list') as View,
  };

  function update(patch: Partial<Record<keyof typeof filters, string | number | string[]>>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(patch)) {
      const str = Array.isArray(value) ? value.join(',') : String(value ?? '');
      if (
        !str ||
        (key === 'page' && str === '1') ||
        (key === 'sort' && str === 'updated') ||
        (key === 'view' && str === 'list')
      ) {
        next.delete(key);
      } else {
        next.set(key, str);
      }
    }
    if (!('page' in patch)) next.delete('page');
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return { filters, update };
}

function Toolbar({ filters, update }: ReturnType<typeof useFilters>) {
  const { t } = useI18n();
  const [q, setQ] = useState(filters.q);

  // Debounce the search box so we do not fire a request on every keystroke.
  useEffect(() => {
    if (q === filters.q) return;
    const id = setTimeout(() => update({ q }), 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const toggleStatus = (s: ApplicationStatus) =>
    update({ status: filters.status.includes(s) ? filters.status.filter((x) => x !== s) : [...filters.status, s] });
  const hasFilters = filters.q || filters.status.length || filters.workMode;

  return (
    <div className="mb-4 flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <IconSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('applications.searchPlaceholder')}
            aria-label={t('common.search')}
            className="pl-9"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Select
            value={filters.workMode}
            onChange={(e) => update({ workMode: e.target.value })}
            aria-label={t('applications.workMode')}
            className="sm:w-48"
          >
            <option value="">{t('applications.anyWorkMode')}</option>
            {WORK_MODES.map((m) => (
              <option key={m} value={m}>
                {t(`workMode.${m}`)}
              </option>
            ))}
          </Select>
          {filters.view === 'list' && (
            <Select
              value={filters.sort}
              onChange={(e) => update({ sort: e.target.value })}
              aria-label={t('applications.sort')}
              className="sm:w-44"
            >
              {APPLICATION_SORTS.map((s) => (
                <option key={s} value={s}>
                  {t(`applications.sort.${s}`)}
                </option>
              ))}
            </Select>
          )}
          <div
            className="col-span-2 inline-flex h-10 rounded-lg border border-border bg-surface p-0.5 [&>button]:flex-1 sm:col-span-1 sm:[&>button]:flex-none"
            role="group"
          >
            {(['list', 'board'] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={filters.view === v}
                onClick={() => update({ view: v })}
                className={clsx(
                  'rounded-md px-3 text-sm font-medium',
                  filters.view === v ? 'bg-primary-soft text-primary' : 'text-muted hover:text-fg',
                )}
              >
                {t(v === 'list' ? 'applications.viewList' : 'applications.viewBoard')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filters.view === 'list' && (
        <div className="flex flex-wrap items-center gap-1.5">
          {APPLICATION_STATUSES.map((s) => {
            const on = filters.status.includes(s);
            return (
              <button
                key={s}
                type="button"
                aria-pressed={on}
                onClick={() => toggleStatus(s)}
                className={clsx(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                  on ? 'border-transparent text-fg' : 'border-border text-muted hover:text-fg',
                )}
                style={on ? { background: `color-mix(in srgb, ${STATUS_COLOR[s]} 16%, transparent)` } : undefined}
              >
                <StatusDot status={s} />
                {t(`status.${s}`)}
              </button>
            );
          })}
          {hasFilters ? (
            <button
              type="button"
              onClick={() => {
                setQ('');
                update({ q: '', status: [], workMode: '' });
              }}
              className="ml-1 text-xs font-medium text-primary hover:underline"
            >
              {t('applications.clearFilters')}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

function ListView({ items }: { items: ApplicationSummary[] }) {
  const { t, locale } = useI18n();
  return (
    <Card className="overflow-hidden">
      {/* Table on wide screens */}
      <table className="hidden w-full text-sm md:table">
        <thead className="border-b border-border bg-surface-2 text-left text-xs font-medium text-muted">
          <tr>
            <th className="px-4 py-2.5 font-medium">{t('field.title')}</th>
            <th className="px-4 py-2.5 font-medium">{t('field.status')}</th>
            <th className="px-4 py-2.5 font-medium">{t('field.location')}</th>
            <th className="px-4 py-2.5 font-medium">{t('field.source')}</th>
            <th className="px-4 py-2.5 font-medium">{t('field.appliedAt')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((app) => (
            <tr key={app.id} className="hover:bg-surface-2">
              <td className="max-w-80 px-4 py-3">
                <Link href={`/applications/${app.id}`} className="block font-medium text-fg hover:text-primary">
                  <span className="block truncate">{app.title}</span>
                  <span className="block truncate text-xs font-normal text-muted">
                    {app.company.name}
                    {app.salaryMin || app.salaryMax
                      ? ` · ${formatSalaryRange(app.salaryMin, app.salaryMax, app.currency, locale)}`
                      : ''}
                  </span>
                </Link>
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={app.status} />
              </td>
              <td className="px-4 py-3 text-muted">
                {app.location ?? '—'}
                {app.workMode && <span className="block text-xs text-subtle">{t(`workMode.${app.workMode}`)}</span>}
              </td>
              <td className="px-4 py-3 text-muted">{app.source ?? '—'}</td>
              <td className="px-4 py-3 whitespace-nowrap text-muted">{formatDate(app.appliedAt, locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Cards on phones */}
      <ul className="divide-y divide-border md:hidden">
        {items.map((app) => (
          <li key={app.id}>
            <Link href={`/applications/${app.id}`} className="flex flex-col gap-1.5 px-4 py-3 hover:bg-surface-2">
              <div className="flex items-start justify-between gap-3">
                <span className="font-medium">{app.title}</span>
                <StatusBadge status={app.status} />
              </div>
              <span className="text-xs text-muted">
                {app.company.name}
                {app.location ? ` · ${app.location}` : ''} · {formatDate(app.appliedAt ?? app.createdAt, locale)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function BoardView({ items }: { items: ApplicationSummary[] }) {
  const { t } = useI18n();
  const move = useMoveApplication();
  const [over, setOver] = useState<ApplicationStatus | null>(null);

  const onDrop = (status: ApplicationStatus) => (e: DragEvent) => {
    e.preventDefault();
    setOver(null);
    const id = e.dataTransfer.getData('text/plain');
    const app = items.find((a) => a.id === id);
    if (app && app.status !== status) move.mutate({ id, status });
  };

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6">
      <div className="flex min-w-max gap-3">
        {APPLICATION_STATUSES.map((status) => {
          const column = items.filter((a) => a.status === status);
          return (
            <section
              key={status}
              aria-label={t(`status.${status}`)}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(status);
              }}
              onDragLeave={() => setOver((s) => (s === status ? null : s))}
              onDrop={onDrop(status)}
              className={clsx(
                'flex w-64 shrink-0 flex-col rounded-xl border bg-surface-2/60 p-2 transition-colors',
                over === status ? 'border-primary' : 'border-border',
              )}
            >
              <h2 className="flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-muted uppercase">
                <StatusDot status={status} />
                {t(`status.${status}`)}
                <span className="ml-auto tabular-nums">{column.length}</span>
              </h2>
              <ul className="flex min-h-24 flex-col gap-2">
                {column.map((app) => (
                  <li
                    key={app.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', app.id)}
                    className="cursor-grab rounded-lg border border-border bg-surface p-3 shadow-sm active:cursor-grabbing"
                  >
                    <Link href={`/applications/${app.id}`} className="block text-sm font-medium hover:text-primary">
                      {app.title}
                    </Link>
                    <p className="mt-0.5 truncate text-xs text-muted">{app.company.name}</p>
                    <Select
                      value={app.status}
                      onChange={(e) => move.mutate({ id: app.id, status: e.target.value as ApplicationStatus })}
                      aria-label={`${t('applications.moveTo')}: ${app.title}`}
                      className="mt-2 h-8 text-xs"
                    >
                      {APPLICATION_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {t(`status.${s}`)}
                        </option>
                      ))}
                    </Select>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function ApplicationsContent() {
  const { t } = useI18n();
  const { filters, update } = useFilters();
  const isBoard = filters.view === 'board';

  const query: ApplicationQuery = {
    q: filters.q,
    status: isBoard ? undefined : filters.status,
    workMode: filters.workMode,
    sort: filters.sort,
    order: filters.sort === 'company' || filters.sort === 'title' ? 'asc' : 'desc',
    page: isBoard ? 1 : filters.page,
    pageSize: isBoard ? 100 : 20,
  };
  const { data, isPending, isError, refetch, isFetching } = useApplications(query);

  return (
    <>
      <PageHeader
        title={t('applications.title')}
        subtitle={data ? t('applications.count', { n: data.total }) : undefined}
        actions={
          <ButtonLink href="/applications/new">
            <IconPlus /> {t('applications.new')}
          </ButtonLink>
        }
      />
      <Toolbar filters={filters} update={update} />

      {isPending ? (
        <LoadingBlock label={t('common.loading')} />
      ) : isError ? (
        <ErrorBlock message={t('common.error')} onRetry={() => refetch()} retryLabel={t('common.retry')} />
      ) : data.items.length === 0 ? (
        <Card>
          <EmptyState
            title={
              filters.q || filters.status.length || filters.workMode
                ? t('applications.empty')
                : t('applications.emptyFirst')
            }
            action={
              <ButtonLink href="/applications/new" size="sm">
                <IconPlus /> {t('applications.new')}
              </ButtonLink>
            }
          />
        </Card>
      ) : (
        <div className={clsx('transition-opacity', isFetching && 'opacity-70')}>
          {isBoard ? <BoardView items={data.items} /> : <ListView items={data.items} />}
          {!isBoard && data.totalPages > 1 && (
            <nav className="mt-4 flex items-center justify-between text-sm text-muted">
              <span>{t('common.pageOf', { page: data.page, total: data.totalPages })}</span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={data.page <= 1}
                  onClick={() => update({ page: data.page - 1 })}
                >
                  {t('common.previous')}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={data.page >= data.totalPages}
                  onClick={() => update({ page: data.page + 1 })}
                >
                  {t('common.next')}
                </Button>
              </div>
            </nav>
          )}
        </div>
      )}
    </>
  );
}

export default function ApplicationsPage() {
  return (
    <Suspense>
      <ApplicationsContent />
    </Suspense>
  );
}
