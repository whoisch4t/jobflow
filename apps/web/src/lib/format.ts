import type { Locale } from './i18n/config';

const intlLocale = (locale: Locale) => (locale === 'tr' ? 'tr-TR' : 'en-GB');

export function formatDate(value: string | Date | null | undefined, locale: Locale) {
  if (!value) return '—';
  return new Intl.DateTimeFormat(intlLocale(locale), { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(value),
  );
}

export function formatDateTime(value: string | Date | null | undefined, locale: Locale) {
  if (!value) return '—';
  return new Intl.DateTimeFormat(intlLocale(locale), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function formatRelative(value: string | Date, locale: Locale, now = Date.now()) {
  const diffMs = new Date(value).getTime() - now;
  const rtf = new Intl.RelativeTimeFormat(intlLocale(locale), { numeric: 'auto' });
  const abs = Math.abs(diffMs);
  const minutes = Math.round(diffMs / 60_000);
  if (abs < 60 * 60_000) return rtf.format(minutes, 'minute');
  const hours = Math.round(diffMs / 3_600_000);
  if (abs < 24 * 3_600_000) return rtf.format(hours, 'hour');
  const days = Math.round(diffMs / 86_400_000);
  if (abs < 30 * 86_400_000) return rtf.format(days, 'day');
  return formatDate(value, locale);
}

export function formatMoney(amount: number | null | undefined, currency: string | null | undefined, locale: Locale) {
  if (amount == null) return '';
  try {
    return new Intl.NumberFormat(intlLocale(locale), {
      style: 'currency',
      currency: currency ?? 'EUR',
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString(intlLocale(locale))} ${currency ?? ''}`.trim();
  }
}

export function formatSalaryRange(min: number | null, max: number | null, currency: string | null, locale: Locale) {
  if (min == null && max == null) return '';
  if (min != null && max != null)
    return `${formatMoney(min, currency, locale)} – ${formatMoney(max, currency, locale)}`;
  return formatMoney(min ?? max, currency, locale);
}

export const percent = (value: number) => `${Math.round(value * 100)}%`;

/** Value for <input type="date"> from an ISO string. */
export const toDateInput = (value: string | null | undefined) => (value ? value.slice(0, 10) : '');

/** Value for <input type="datetime-local"> in the user's local time. */
export function toDateTimeInput(value: string | null | undefined) {
  if (!value) return '';
  const d = new Date(value);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

/** Converts a datetime-local value (local time) to an ISO string. */
export const fromDateTimeInput = (value: string) => (value ? new Date(value).toISOString() : '');
