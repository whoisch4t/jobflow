'use client';

import clsx from 'clsx';
import { useRouter } from 'next/navigation';
import { LOCALES, useI18n } from '@/lib/i18n';

export function LanguageSwitch({ className }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();
  const router = useRouter();
  return (
    <div
      role="group"
      aria-label={t('nav.language')}
      className={clsx('inline-flex rounded-lg border border-border p-0.5', className)}
    >
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={locale === l}
          onClick={() => {
            setLocale(l);
            router.refresh();
          }}
          className={clsx(
            'rounded-md px-2 py-0.5 text-xs font-semibold uppercase transition-colors',
            locale === l ? 'bg-primary-soft text-primary' : 'text-muted hover:text-fg',
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
