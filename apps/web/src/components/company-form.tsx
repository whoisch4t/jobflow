'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { Company } from '@jobflow/shared';
import { api, ApiError } from '@/lib/api';
import { useWrite } from '@/lib/queries';
import { useT } from '@/lib/i18n';
import { Button, Field, FormError, Input, Textarea } from './ui';

interface CompanyValues {
  name: string;
  website: string;
  location: string;
  industry: string;
  notes: string;
}

export function CompanyForm({ company, onDone }: { company?: Company; onDone: () => void }) {
  const t = useT();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<CompanyValues>({
    defaultValues: {
      name: company?.name ?? '',
      website: company?.website ?? '',
      location: company?.location ?? '',
      industry: company?.industry ?? '',
      notes: company?.notes ?? '',
    },
  });
  const save = useWrite((body: CompanyValues) =>
    company ? api(`/companies/${company.id}`, { method: 'PATCH', body }) : api('/companies', { method: 'POST', body }),
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
            for (const [path, message] of Object.entries(e.fieldErrors)) {
              form.setError(path as keyof CompanyValues, { message });
            }
          } else {
            setFormError(e instanceof ApiError ? e.message : t('common.error'));
          }
        }
      })}
    >
      <FormError message={formError} />
      <Field label={t('field.name')} error={errors.name?.message}>
        {(p) => <Input {...p} autoFocus {...form.register('name')} />}
      </Field>
      <Field label={t('field.website')} error={errors.website?.message} {...optional}>
        {(p) => <Input {...p} type="url" placeholder="https://" {...form.register('website')} />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('field.location')} error={errors.location?.message} {...optional}>
          {(p) => <Input {...p} {...form.register('location')} />}
        </Field>
        <Field label={t('field.industry')} error={errors.industry?.message} {...optional}>
          {(p) => <Input {...p} {...form.register('industry')} />}
        </Field>
      </div>
      <Field label={t('field.notes')} error={errors.notes?.message} {...optional}>
        {(p) => <Textarea {...p} rows={3} {...form.register('notes')} />}
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
