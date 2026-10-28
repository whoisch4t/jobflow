'use client';

import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { APPLICATION_STATUSES, WORK_MODES, type ApplicationDetail, type Company } from '@jobflow/shared';
import { api, ApiError } from '@/lib/api';
import { useCompanies, useCvVersions } from '@/lib/queries';
import { useT } from '@/lib/i18n';
import { toDateInput } from '@/lib/format';
import { Button, Field, FormError, Input, Select, Textarea } from './ui';

export interface ApplicationFormValues {
  title: string;
  company: string;
  status: string;
  workMode: string;
  location: string;
  source: string;
  jobUrl: string;
  salaryMin: string;
  salaryMax: string;
  currency: string;
  appliedAt: string;
  cvVersionId: string;
  description: string;
}

const CURRENCIES = ['EUR', 'USD', 'GBP', 'TRY'];

export function toFormValues(app?: ApplicationDetail): ApplicationFormValues {
  return {
    title: app?.title ?? '',
    company: app?.company.name ?? '',
    status: app?.status ?? 'WISHLIST',
    workMode: app?.workMode ?? '',
    location: app?.location ?? '',
    source: app?.source ?? '',
    jobUrl: app?.jobUrl ?? '',
    salaryMin: app?.salaryMin?.toString() ?? '',
    salaryMax: app?.salaryMax?.toString() ?? '',
    currency: app?.currency ?? 'EUR',
    appliedAt: toDateInput(app?.appliedAt),
    cvVersionId: app?.cvVersion?.id ?? '',
    description: app?.description ?? '',
  };
}

/** Resolves a typed company name to an existing company id, creating the company if needed. */
async function resolveCompanyId(name: string, companies: Company[]) {
  const existing = companies.find((c) => c.name.toLowerCase() === name.trim().toLowerCase());
  if (existing) return existing.id;
  const res = await api<{ company: Company }>('/companies', { method: 'POST', body: { name } });
  return res.company.id;
}

export function ApplicationForm({
  application,
  onSaved,
  onCancel,
}: {
  application?: ApplicationDetail;
  onSaved: (id: string) => void;
  onCancel?: () => void;
}) {
  const t = useT();
  const companies = useCompanies();
  const cvVersions = useCvVersions();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<ApplicationFormValues>({ defaultValues: toFormValues(application) });
  const { errors, isSubmitting } = form.formState;
  const err = (name: keyof ApplicationFormValues) => errors[name]?.message;

  async function submit(values: ApplicationFormValues) {
    setFormError(null);
    const { company, ...rest } = values;
    const appliedAt = values.appliedAt || (application ? null : '');
    try {
      if (application) {
        const companyId =
          company.trim().toLowerCase() === application.company.name.toLowerCase()
            ? application.company.id
            : await resolveCompanyId(company, companies.data ?? []);
        await api(`/applications/${application.id}`, {
          method: 'PATCH',
          body: { ...rest, appliedAt, companyId },
        });
        onSaved(application.id);
      } else {
        const res = await api<{ application: { id: string } }>('/applications', {
          method: 'POST',
          body: { ...rest, companyName: company },
        });
        onSaved(res.application.id);
      }
    } catch (e) {
      if (e instanceof ApiError && e.details.length) {
        for (const [path, message] of Object.entries(e.fieldErrors)) {
          const field = path === 'companyName' || path === 'companyId' ? 'company' : path;
          form.setError(field as keyof ApplicationFormValues, { message });
        }
      } else {
        setFormError(e instanceof ApiError ? e.message : t('common.error'));
      }
    }
  }

  const optional = { optional: true, optionalLabel: t('common.optional') };

  return (
    <form onSubmit={form.handleSubmit(submit)} className="flex flex-col gap-5" noValidate>
      <FormError message={formError} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('field.title')} error={err('title')}>
          {(p) => <Input {...p} autoFocus={!application} {...form.register('title')} />}
        </Field>
        <Field label={t('field.company')} error={err('company')} hint={t('field.companyNew')}>
          {(p) => (
            <>
              <Input {...p} list="company-options" autoComplete="off" {...form.register('company')} />
              <datalist id="company-options">
                {companies.data?.map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </>
          )}
        </Field>

        <Field label={t('field.status')} error={err('status')}>
          {(p) => (
            <Select {...p} {...form.register('status')}>
              {APPLICATION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`status.${s}`)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label={t('field.workMode')} error={err('workMode')} {...optional}>
          {(p) => (
            <Select {...p} {...form.register('workMode')}>
              <option value="">—</option>
              {WORK_MODES.map((m) => (
                <option key={m} value={m}>
                  {t(`workMode.${m}`)}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field label={t('field.location')} error={err('location')} {...optional}>
          {(p) => <Input {...p} {...form.register('location')} />}
        </Field>
        <Field label={t('field.source')} error={err('source')} {...optional}>
          {(p) => <Input {...p} placeholder={t('field.sourcePlaceholder')} {...form.register('source')} />}
        </Field>

        <Field label={t('field.jobUrl')} error={err('jobUrl')} className="sm:col-span-2" {...optional}>
          {(p) => <Input {...p} type="url" placeholder="https://" {...form.register('jobUrl')} />}
        </Field>

        <div className="grid grid-cols-[1fr_1fr_6rem] gap-3 sm:col-span-2">
          <Field label={t('field.salaryMin')} error={err('salaryMin')} {...optional}>
            {(p) => <Input {...p} type="number" min={0} inputMode="numeric" {...form.register('salaryMin')} />}
          </Field>
          <Field label={t('field.salaryMax')} error={err('salaryMax')}>
            {(p) => <Input {...p} type="number" min={0} inputMode="numeric" {...form.register('salaryMax')} />}
          </Field>
          <Field label={t('field.currency')} error={err('currency')}>
            {(p) => (
              <Select {...p} {...form.register('currency')}>
                {CURRENCIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <Field label={t('field.appliedAt')} error={err('appliedAt')} {...optional}>
          {(p) => <Input {...p} type="date" {...form.register('appliedAt')} />}
        </Field>
        <Field label={t('field.cvVersion')} error={err('cvVersionId')} {...optional}>
          {(p) => (
            <Select {...p} {...form.register('cvVersionId')}>
              <option value="">{t('common.none')}</option>
              {cvVersions.data?.map((cv) => (
                <option key={cv.id} value={cv.id}>
                  {cv.name}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field label={t('field.description')} error={err('description')} className="sm:col-span-2" {...optional}>
          {(p) => <Textarea {...p} rows={5} {...form.register('description')} />}
        </Field>
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
        )}
        <Button type="submit" loading={isSubmitting}>
          {isSubmitting ? t('common.saving') : application ? t('common.save') : t('common.create')}
        </Button>
      </div>
    </form>
  );
}
