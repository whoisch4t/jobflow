'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useCompanies } from '@/lib/queries';
import { useT } from '@/lib/i18n';
import { CompanyForm } from '@/components/company-form';
import { Button, Card, EmptyState, ErrorBlock, LoadingBlock, Modal, PageHeader } from '@/components/ui';
import { IconPlus } from '@/components/icons';

export default function CompaniesPage() {
  const t = useT();
  const { data, isPending, isError, refetch } = useCompanies();
  const [creating, setCreating] = useState(false);

  return (
    <>
      <PageHeader
        title={t('companies.title')}
        actions={
          <Button onClick={() => setCreating(true)}>
            <IconPlus /> {t('companies.new')}
          </Button>
        }
      />
      {isPending ? (
        <LoadingBlock label={t('common.loading')} />
      ) : isError ? (
        <ErrorBlock message={t('common.error')} onRetry={() => refetch()} retryLabel={t('common.retry')} />
      ) : data.length === 0 ? (
        <Card>
          <EmptyState title={t('companies.empty')} />
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((c) => (
            <li key={c.id}>
              <Link href={`/companies/${c.id}`} className="block h-full">
                <Card className="h-full p-4 transition-colors hover:border-primary">
                  <div className="flex items-start gap-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-2 text-sm font-semibold text-muted">
                      {c.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{c.name}</p>
                      <p className="truncate text-xs text-muted">
                        {[c.industry, c.location].filter(Boolean).join(' · ') || '—'}
                      </p>
                      <p className="mt-2 text-xs font-medium text-primary">
                        {t('companies.applications', { n: c._count?.applications ?? 0 })}
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Modal open={creating} onClose={() => setCreating(false)} title={t('companies.new')}>
        {creating && <CompanyForm onDone={() => setCreating(false)} />}
      </Modal>
    </>
  );
}
