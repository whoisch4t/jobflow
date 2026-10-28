'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  INTERVIEW_OUTCOMES,
  INTERVIEW_TYPES,
  OFFER_DECISIONS,
  type ApplicationDetail,
  type Interview,
  type InterviewOutcome,
  type Note,
  type Offer,
} from '@jobflow/shared';
import { api, ApiError } from '@/lib/api';
import { useWrite } from '@/lib/queries';
import { useI18n } from '@/lib/i18n';
import { formatDate, formatDateTime, formatMoney, fromDateTimeInput, toDateInput, toDateTimeInput } from '@/lib/format';
import { Button, Card, CardHeader, Field, FormError, Input, Modal, Select, Textarea } from './ui';
import { IconPencil, IconPlus, IconTrash } from './icons';
import { StatusDot } from './status-badge';

/** Maps API field errors onto a react-hook-form form; returns a message for anything else. */
function applyApiError(e: unknown, setError: (name: never, error: { message: string }) => void, fallback: string) {
  if (e instanceof ApiError && e.details.length) {
    for (const [path, message] of Object.entries(e.fieldErrors)) setError(path as never, { message });
    return null;
  }
  return e instanceof ApiError ? e.message : fallback;
}

const OUTCOME_COLOR: Record<InterviewOutcome, string> = {
  PENDING: 'var(--color-muted)',
  PASSED: 'var(--color-success)',
  FAILED: 'var(--color-danger)',
  CANCELLED: 'var(--color-subtle)',
};

// ---------- Interviews ----------

interface InterviewValues {
  type: string;
  scheduledAt: string;
  durationMinutes: string;
  interviewer: string;
  location: string;
  outcome: string;
  notes: string;
}

function InterviewForm({
  applicationId,
  interview,
  onDone,
}: {
  applicationId: string;
  interview?: Interview;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<InterviewValues>({
    defaultValues: {
      type: interview?.type ?? 'PHONE',
      scheduledAt: toDateTimeInput(interview?.scheduledAt),
      durationMinutes: interview?.durationMinutes?.toString() ?? '45',
      interviewer: interview?.interviewer ?? '',
      location: interview?.location ?? '',
      outcome: interview?.outcome ?? 'PENDING',
      notes: interview?.notes ?? '',
    },
  });
  const save = useWrite((values: InterviewValues) => {
    const body = { ...values, scheduledAt: fromDateTimeInput(values.scheduledAt) };
    return interview
      ? api(`/interviews/${interview.id}`, { method: 'PATCH', body })
      : api(`/applications/${applicationId}/interviews`, { method: 'POST', body });
  });
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
          setFormError(applyApiError(e, form.setError as never, t('common.error')));
        }
      })}
    >
      <FormError message={formError} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('field.type')} error={errors.type?.message}>
          {(p) => (
            <Select {...p} {...form.register('type')}>
              {INTERVIEW_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`interviewType.${type}`)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label={t('field.scheduledAt')} error={errors.scheduledAt?.message}>
          {(p) => <Input {...p} type="datetime-local" {...form.register('scheduledAt')} />}
        </Field>
        <Field label={t('field.duration')} error={errors.durationMinutes?.message} {...optional}>
          {(p) => <Input {...p} type="number" min={5} step={5} {...form.register('durationMinutes')} />}
        </Field>
        <Field label={t('field.outcome')} error={errors.outcome?.message}>
          {(p) => (
            <Select {...p} {...form.register('outcome')}>
              {INTERVIEW_OUTCOMES.map((o) => (
                <option key={o} value={o}>
                  {t(`outcome.${o}`)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label={t('field.interviewer')} error={errors.interviewer?.message} {...optional}>
          {(p) => <Input {...p} {...form.register('interviewer')} />}
        </Field>
        <Field label={t('field.meetingLocation')} error={errors.location?.message} {...optional}>
          {(p) => <Input {...p} {...form.register('location')} />}
        </Field>
        <Field label={t('field.notes')} error={errors.notes?.message} className="sm:col-span-2" {...optional}>
          {(p) => <Textarea {...p} rows={3} {...form.register('notes')} />}
        </Field>
      </div>
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

export function InterviewsSection({ application }: { application: ApplicationDetail }) {
  const { t, locale } = useI18n();
  const [editing, setEditing] = useState<Interview | 'new' | null>(null);
  const remove = useWrite((id: string) => api(`/interviews/${id}`, { method: 'DELETE' }));

  return (
    <Card>
      <CardHeader
        title={t('detail.interviews')}
        hint={t('detail.autoStatusHint')}
        action={
          <Button size="sm" variant="secondary" onClick={() => setEditing('new')}>
            <IconPlus /> {t('detail.addInterview')}
          </Button>
        }
      />
      {application.interviews.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">{t('detail.noInterviews')}</p>
      ) : (
        <ul className="divide-y divide-border">
          {application.interviews.map((i) => (
            <li key={i.id} className="flex items-start gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {t(`interviewType.${i.type}`)}
                  <span className="ml-2 text-xs font-medium" style={{ color: OUTCOME_COLOR[i.outcome] }}>
                    {t(`outcome.${i.outcome}`)}
                  </span>
                </p>
                <p className="text-xs text-muted">
                  {formatDateTime(i.scheduledAt, locale)}
                  {i.durationMinutes ? ` · ${i.durationMinutes} min` : ''}
                  {i.interviewer ? ` · ${i.interviewer}` : ''}
                  {i.location ? ` · ${i.location}` : ''}
                </p>
                {i.notes && <p className="mt-1 text-sm whitespace-pre-wrap text-fg">{i.notes}</p>}
              </div>
              <div className="flex shrink-0 gap-1">
                <Button size="sm" variant="ghost" aria-label={t('common.edit')} onClick={() => setEditing(i)}>
                  <IconPencil />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={t('common.delete')}
                  onClick={() => confirm(t('common.confirmDelete')) && remove.mutate(i.id)}
                >
                  <IconTrash />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? t('detail.addInterview') : t('common.edit')}
        wide
      >
        {editing !== null && (
          <InterviewForm
            applicationId={application.id}
            interview={editing === 'new' ? undefined : editing}
            onDone={() => setEditing(null)}
          />
        )}
      </Modal>
    </Card>
  );
}

// ---------- Offer ----------

interface OfferValues {
  salary: string;
  currency: string;
  bonus: string;
  equity: string;
  benefits: string;
  startDate: string;
  deadline: string;
  decision: string;
}

function OfferForm({
  applicationId,
  offer,
  onDone,
}: {
  applicationId: string;
  offer: Offer | null;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<OfferValues>({
    defaultValues: {
      salary: offer?.salary.toString() ?? '',
      currency: offer?.currency ?? 'EUR',
      bonus: offer?.bonus ?? '',
      equity: offer?.equity ?? '',
      benefits: offer?.benefits ?? '',
      startDate: toDateInput(offer?.startDate),
      deadline: toDateInput(offer?.deadline),
      decision: offer?.decision ?? 'PENDING',
    },
  });
  const save = useWrite((body: OfferValues) => api(`/applications/${applicationId}/offer`, { method: 'PUT', body }));
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
          setFormError(applyApiError(e, form.setError as never, t('common.error')));
        }
      })}
    >
      <FormError message={formError} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid grid-cols-[1fr_6rem] gap-3 sm:col-span-2">
          <Field label={t('field.salary')} error={errors.salary?.message}>
            {(p) => <Input {...p} type="number" min={0} {...form.register('salary')} />}
          </Field>
          <Field label={t('field.currency')} error={errors.currency?.message}>
            {(p) => (
              <Select {...p} {...form.register('currency')}>
                {['EUR', 'USD', 'GBP', 'TRY'].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <Field label={t('field.bonus')} error={errors.bonus?.message} {...optional}>
          {(p) => <Input {...p} {...form.register('bonus')} />}
        </Field>
        <Field label={t('field.equity')} error={errors.equity?.message} {...optional}>
          {(p) => <Input {...p} {...form.register('equity')} />}
        </Field>
        <Field label={t('field.startDate')} error={errors.startDate?.message} {...optional}>
          {(p) => <Input {...p} type="date" {...form.register('startDate')} />}
        </Field>
        <Field label={t('field.deadline')} error={errors.deadline?.message} {...optional}>
          {(p) => <Input {...p} type="date" {...form.register('deadline')} />}
        </Field>
        <Field label={t('field.decision')} error={errors.decision?.message}>
          {(p) => (
            <Select {...p} {...form.register('decision')}>
              {OFFER_DECISIONS.map((d) => (
                <option key={d} value={d}>
                  {t(`decision.${d}`)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label={t('field.benefits')} error={errors.benefits?.message} className="sm:col-span-2" {...optional}>
          {(p) => <Textarea {...p} rows={3} {...form.register('benefits')} />}
        </Field>
      </div>
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

export function OfferSection({ application }: { application: ApplicationDetail }) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const offer = application.offer;
  const remove = useWrite(() => api(`/applications/${application.id}/offer`, { method: 'DELETE' }));

  const rows: [string, string | null][] = offer
    ? [
        [t('field.salary'), formatMoney(offer.salary, offer.currency, locale)],
        [t('field.bonus'), offer.bonus],
        [t('field.equity'), offer.equity],
        [t('field.startDate'), offer.startDate ? formatDate(offer.startDate, locale) : null],
        [t('field.deadline'), offer.deadline ? formatDate(offer.deadline, locale) : null],
        [t('field.decision'), t(`decision.${offer.decision}`)],
      ]
    : [];

  return (
    <Card>
      <CardHeader
        title={t('detail.offer')}
        action={
          <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
            {offer ? <IconPencil /> : <IconPlus />} {offer ? t('detail.editOffer') : t('detail.addOffer')}
          </Button>
        }
      />
      {offer ? (
        <div className="px-5 py-4">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            {rows
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-muted">{label}</dt>
                  <dd className="font-medium">{value}</dd>
                </div>
              ))}
          </dl>
          {offer.benefits && <p className="mt-3 text-sm whitespace-pre-wrap text-muted">{offer.benefits}</p>}
          <button
            type="button"
            onClick={() => confirm(t('common.confirmDelete')) && remove.mutate(undefined)}
            className="mt-4 text-xs font-medium text-danger hover:underline"
          >
            {t('detail.removeOffer')}
          </button>
        </div>
      ) : (
        <p className="px-5 py-6 text-sm text-muted">{t('detail.noOffer')}</p>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={offer ? t('detail.editOffer') : t('detail.addOffer')}
        wide
      >
        {open && <OfferForm applicationId={application.id} offer={offer} onDone={() => setOpen(false)} />}
      </Modal>
    </Card>
  );
}

// ---------- Notes ----------

function NoteItem({ note }: { note: Note }) {
  const { t, locale } = useI18n();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.content);
  const update = useWrite((content: string) => api(`/notes/${note.id}`, { method: 'PATCH', body: { content } }));
  const remove = useWrite(() => api(`/notes/${note.id}`, { method: 'DELETE' }));

  return (
    <li className="px-5 py-3">
      {editing ? (
        <div className="flex flex-col gap-2">
          <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} aria-label={t('common.edit')} />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              size="sm"
              loading={update.isPending}
              disabled={!draft.trim()}
              onClick={async () => {
                await update.mutateAsync(draft);
                setEditing(false);
              }}
            >
              {t('common.save')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="group flex gap-3">
          <p className="flex-1 text-sm whitespace-pre-wrap">{note.content}</p>
          <div className="flex shrink-0 gap-1 opacity-100 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
            <Button size="sm" variant="ghost" aria-label={t('common.edit')} onClick={() => setEditing(true)}>
              <IconPencil />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              aria-label={t('common.delete')}
              onClick={() => confirm(t('common.confirmDelete')) && remove.mutate(undefined)}
            >
              <IconTrash />
            </Button>
          </div>
        </div>
      )}
      <p className="mt-1 text-xs text-subtle">{formatDateTime(note.createdAt, locale)}</p>
    </li>
  );
}

export function NotesSection({ application }: { application: ApplicationDetail }) {
  const { t } = useI18n();
  const [content, setContent] = useState('');
  const add = useWrite((text: string) =>
    api(`/applications/${application.id}/notes`, { method: 'POST', body: { content: text } }),
  );

  return (
    <Card>
      <CardHeader title={t('detail.notes')} />
      <form
        className="flex flex-col gap-2 border-b border-border px-5 py-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!content.trim()) return;
          await add.mutateAsync(content);
          setContent('');
        }}
      >
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t('detail.noteplaceholder')}
          aria-label={t('detail.addNote')}
          rows={2}
          className="min-h-16"
        />
        <Button type="submit" size="sm" className="self-end" loading={add.isPending} disabled={!content.trim()}>
          {t('detail.addNote')}
        </Button>
      </form>
      {application.notes.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">{t('detail.noNotes')}</p>
      ) : (
        <ul className="divide-y divide-border">
          {application.notes.map((n) => (
            <NoteItem key={n.id} note={n} />
          ))}
        </ul>
      )}
    </Card>
  );
}

// ---------- Timeline ----------

export function Timeline({ application }: { application: ApplicationDetail }) {
  const { t, locale } = useI18n();
  return (
    <Card>
      <CardHeader title={t('detail.timeline')} />
      <ol className="relative px-5 py-4">
        {application.statusHistory.map((change, index) => (
          <li key={change.id} className="relative flex gap-3 pb-4 last:pb-0">
            {index < application.statusHistory.length - 1 && (
              <span className="absolute top-3 left-[3px] h-full w-px bg-border" aria-hidden />
            )}
            <span className="relative mt-1.5">
              <StatusDot status={change.toStatus} />
            </span>
            <div>
              <p className="text-sm font-medium">
                {change.fromStatus === null
                  ? `${t('detail.created')} · ${t(`status.${change.toStatus}`)}`
                  : t('detail.changedTo', { status: t(`status.${change.toStatus}`) })}
              </p>
              <p className="text-xs text-muted">{formatDateTime(change.changedAt, locale)}</p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
