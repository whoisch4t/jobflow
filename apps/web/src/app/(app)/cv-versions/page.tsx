'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { CvVersion } from '@jobflow/shared';
import { api, ApiError } from '@/lib/api';
import { useCvVersions, useWrite } from '@/lib/queries';
import { useI18n } from '@/lib/i18n';
import { formatDate } from '@/lib/format';
import {
  Button,
  Card,
  EmptyState,
  ErrorBlock,
  Field,
  FormError,
  Input,
  LoadingBlock,
  Modal,
  PageHeader,
  Textarea,
} from '@/components/ui';
import { IconExternal, IconPencil, IconPlus, IconTrash } from '@/components/icons';

interface CvValues {
  name: string;
  url: string;
  description: string;
}

function CvForm({ cv, onDone }: { cv?: CvVersion; onDone: () => void }) {
  const { t } = useI18n();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<CvValues>({
    defaultValues: { name: cv?.name ?? '', url: cv?.url ?? '', description: cv?.description ?? '' },
  });
  const save = useWrite((body: CvValues) =>
    cv ? api(`/cv-versions/${cv.id}`, { method: 'PATCH', body }) : api('/cv-versions', { method: 'POST', body }),
  );
  const errors = form.formState.errors;
  const optional = { optional: true, optionalLabel: t('common.optional') };

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={form.handleSubmit(async (values) => {
        setFormError(null);
        try {
          await save.mutateAsync(values);
          onDone();
        } catch (e) {
          if (e instanceof ApiError && e.details.length) {
            for (const [path, message] of Object.entries(e.fieldErrors))
              form.setError(path as keyof CvValues, { message });
          } else {
            setFormError(e instanceof ApiError ? e.message : t('common.error'));
          }
        }
      })}
    >
      <FormError message={formError} />
      <Field label={t('field.name')} error={errors.name?.message}>
        {(p) => <Input {...p} autoFocus placeholder="Full-Stack (EN) — v3" {...form.register('name')} />}
      </Field>
      <Field label={t('field.url')} error={errors.url?.message} {...optional}>
        {(p) => <Input {...p} type="url" placeholder="https://drive.google.com/…" {...form.register('url')} />}
      </Field>
      <Field label={t('field.description')} error={errors.description?.message} {...optional}>
        {(p) => <Textarea {...p} rows={3} {...form.register('description')} />}
      </Field>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onDone}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" loading={form.formState.isSubmitting}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
}

export default function CvVersionsPage() {
  const { t, locale } = useI18n();
  const { data, isPending, isError, refetch } = useCvVersions();
  const [editing, setEditing] = useState<CvVersion | 'new' | null>(null);
  const remove = useWrite((id: string) => api(`/cv-versions/${id}`, { method: 'DELETE' }));

  return (
    <>
      <PageHeader
        title={t('cv.title')}
        subtitle={t('cv.subtitle')}
        actions={
          <Button onClick={() => setEditing('new')}>
            <IconPlus /> {t('cv.new')}
          </Button>
        }
      />
      {isPending ? (
        <LoadingBlock label={t('common.loading')} />
      ) : isError ? (
        <ErrorBlock message={t('common.error')} onRetry={() => refetch()} retryLabel={t('common.retry')} />
      ) : data.length === 0 ? (
        <Card>
          <EmptyState title={t('cv.empty')} />
        </Card>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {data.map((cv) => (
            <li key={cv.id}>
              <Card className="flex h-full flex-col p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{cv.name}</p>
                    <p className="text-xs text-muted">
                      {formatDate(cv.createdAt, locale)} · {t('cv.usedIn', { n: cv._count?.applications ?? 0 })}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {cv.url && (
                      <a
                        href={cv.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={t('common.open')}
                        className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg"
                      >
                        <IconExternal />
                      </a>
                    )}
                    <Button size="sm" variant="ghost" aria-label={t('common.edit')} onClick={() => setEditing(cv)}>
                      <IconPencil />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={t('common.delete')}
                      onClick={() => confirm(t('common.confirmDelete')) && remove.mutate(cv.id)}
                    >
                      <IconTrash />
                    </Button>
                  </div>
                </div>
                {cv.description && <p className="mt-3 text-sm text-muted">{cv.description}</p>}
              </Card>
            </li>
          ))}
        </ul>
      )}
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? t('cv.new') : t('common.edit')}
      >
        {editing !== null && <CvForm cv={editing === 'new' ? undefined : editing} onDone={() => setEditing(null)} />}
      </Modal>
    </>
  );
}
