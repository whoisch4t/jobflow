'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { APPLICATION_STATUSES, type ApplicationStatus } from '@jobflow/shared';
import { api, ApiError } from '@/lib/api';
import { useApplication, useInvalidateAll, useMoveApplication, useWrite } from '@/lib/queries';
import { useI18n } from '@/lib/i18n';
import { formatDate, formatSalaryRange } from '@/lib/format';
import { ApplicationForm } from '@/components/application-form';
import { InterviewsSection, NotesSection, OfferSection, Timeline } from '@/components/application-sections';
import { Button, Card, CardHeader, ErrorBlock, LoadingBlock, Modal, Select } from '@/components/ui';
import { IconArrowLeft, IconExternal, IconPencil, IconTrash } from '@/components/icons';
import { STATUS_COLOR } from '@/components/status-badge';

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useI18n();
  const router = useRouter();
  const { data: app, isPending, isError, error, refetch } = useApplication(id);
  const move = useMoveApplication();
  const invalidate = useInvalidateAll();
  const remove = useWrite(() => api(`/applications/${id}`, { method: 'DELETE' }));
  const [editing, setEditing] = useState(false);

  if (isPending) return <LoadingBlock label={t('common.loading')} />;
  if (isError) {
    const missing = error instanceof ApiError && error.status === 404;
    return (
      <ErrorBlock
        message={missing ? error.message : t('common.error')}
        onRetry={missing ? () => router.push('/applications') : () => refetch()}
        retryLabel={missing ? t('nav.applications') : t('common.retry')}
      />
    );
  }

  const details: [string, string | null][] = [
    [
      t('field.location'),
      [app.location, app.workMode && t(`workMode.${app.workMode}`)].filter(Boolean).join(' · ') || null,
    ],
    [t('field.salaryRange'), formatSalaryRange(app.salaryMin, app.salaryMax, app.currency, locale) || null],
    [t('field.source'), app.source],
    [t('field.appliedAt'), app.appliedAt ? formatDate(app.appliedAt, locale) : null],
    [t('field.cvVersion'), app.cvVersion?.name ?? null],
  ];

  return (
    <>
      <Link href="/applications" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <IconArrowLeft /> {t('nav.applications')}
      </Link>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{app.title}</h1>
          <p className="mt-1 text-sm text-muted">
            <Link href={`/companies/${app.company.id}`} className="font-medium text-fg hover:text-primary">
              {app.company.name}
            </Link>
            {' · '}
            {app.appliedAt ? t('detail.applied', { date: formatDate(app.appliedAt, locale) }) : t('detail.notApplied')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={app.status}
            onChange={(e) => move.mutate({ id: app.id, status: e.target.value as ApplicationStatus })}
            aria-label={t('field.status')}
            className="w-44 font-medium"
            style={{ color: STATUS_COLOR[app.status] }}
          >
            {APPLICATION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`status.${s}`)}
              </option>
            ))}
          </Select>
          {app.jobUrl && (
            <a
              href={app.jobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium hover:bg-surface-2"
            >
              <IconExternal /> {t('detail.viewPosting')}
            </a>
          )}
          <Button variant="secondary" onClick={() => setEditing(true)}>
            <IconPencil /> {t('common.edit')}
          </Button>
          <Button
            variant="danger"
            aria-label={t('detail.deleteApplication')}
            onClick={async () => {
              if (!confirm(t('common.confirmDelete'))) return;
              await remove.mutateAsync(undefined);
              router.push('/applications');
            }}
          >
            <IconTrash />
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader title={t('detail.overview')} />
            <div className="px-5 py-4">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
                {details
                  .filter(([, value]) => value)
                  .map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-xs text-muted">{label}</dt>
                      <dd className="font-medium">{value}</dd>
                    </div>
                  ))}
              </dl>
              {app.description && (
                <p className="mt-4 border-t border-border pt-4 text-sm whitespace-pre-wrap text-fg">
                  {app.description}
                </p>
              )}
            </div>
          </Card>
          <InterviewsSection application={app} />
          <NotesSection application={app} />
        </div>
        <div className="flex flex-col gap-6">
          <OfferSection application={app} />
          <Timeline application={app} />
        </div>
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title={t('detail.editApplication')} wide>
        {editing && (
          <ApplicationForm
            application={app}
            onCancel={() => setEditing(false)}
            onSaved={async () => {
              await invalidate();
              setEditing(false);
            }}
          />
        )}
      </Modal>
    </>
  );
}
