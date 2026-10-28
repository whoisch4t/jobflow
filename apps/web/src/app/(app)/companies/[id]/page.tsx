'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useCompany, useWrite } from '@/lib/queries';
import { useI18n } from '@/lib/i18n';
import { formatDate } from '@/lib/format';
import { CompanyForm } from '@/components/company-form';
import { StatusBadge } from '@/components/status-badge';
import {
  Button,
  ButtonLink,
  Card,
  CardHeader,
  EmptyState,
  ErrorBlock,
  LoadingBlock,
  Modal,
  PageHeader,
} from '@/components/ui';
import { IconArrowLeft, IconExternal, IconPencil, IconPlus, IconTrash } from '@/components/icons';

export default function CompanyPage() {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useI18n();
  const router = useRouter();
  const { data: company, isPending, isError, refetch } = useCompany(id);
  const remove = useWrite(() => api(`/companies/${id}`, { method: 'DELETE' }));
  const [editing, setEditing] = useState(false);

  if (isPending) return <LoadingBlock label={t('common.loading')} />;
  if (isError)
    return <ErrorBlock message={t('common.error')} onRetry={() => refetch()} retryLabel={t('common.retry')} />;

  return (
    <>
      <Link href="/companies" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <IconArrowLeft /> {t('nav.companies')}
      </Link>
      <PageHeader
        title={company.name}
        subtitle={[company.industry, company.location].filter(Boolean).join(' · ') || undefined}
        actions={
          <>
            {company.website && (
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium hover:bg-surface-2"
              >
                <IconExternal /> {t('field.website')}
              </a>
            )}
            <Button variant="secondary" onClick={() => setEditing(true)}>
              <IconPencil /> {t('common.edit')}
            </Button>
            <Button
              variant="danger"
              aria-label={t('common.delete')}
              onClick={async () => {
                if (!confirm(`${t('companies.deleteWarning')}\n\n${t('common.confirmDelete')}`)) return;
                await remove.mutateAsync(undefined);
                router.push('/companies');
              }}
            >
              <IconTrash />
            </Button>
          </>
        }
      />

      {company.notes && (
        <Card className="mb-6 p-5">
          <p className="text-sm whitespace-pre-wrap">{company.notes}</p>
        </Card>
      )}

      <Card>
        <CardHeader
          title={t('nav.applications')}
          action={
            <ButtonLink href="/applications/new" size="sm" variant="secondary">
              <IconPlus /> {t('applications.new')}
            </ButtonLink>
          }
        />
        {company.applications.length === 0 ? (
          <EmptyState title={t('applications.emptyFirst')} />
        ) : (
          <ul className="divide-y divide-border">
            {company.applications.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/applications/${a.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-surface-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{a.title}</p>
                    <p className="text-xs text-muted">{formatDate(a.appliedAt ?? a.updatedAt, locale)}</p>
                  </div>
                  <StatusBadge status={a.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal open={editing} onClose={() => setEditing(false)} title={t('common.edit')}>
        {editing && <CompanyForm company={company} onDone={() => setEditing(false)} />}
      </Modal>
    </>
  );
}
