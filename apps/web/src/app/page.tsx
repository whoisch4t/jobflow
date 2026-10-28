'use client';

import Link from 'next/link';
import { ButtonLink } from '@/components/ui';
import { IconBriefcase, IconCalendar, IconDashboard, IconLogo } from '@/components/icons';
import { LanguageSwitch } from '@/components/language-switch';
import { StatusBadge } from '@/components/status-badge';
import { useT } from '@/lib/i18n';
import type { ApplicationStatus } from '@jobflow/shared';

const PREVIEW: { title: string; company: string; status: ApplicationStatus }[] = [
  { title: 'Junior Full-Stack Developer', company: 'Northwind Labs', status: 'OFFER' },
  { title: 'Frontend Engineer (React)', company: 'Bluefin', status: 'INTERVIEWING' },
  { title: 'Backend Developer (Node.js)', company: 'Atlas Commerce', status: 'SCREENING' },
  { title: 'Junior Software Engineer', company: 'Orbit Analytics', status: 'APPLIED' },
];

export default function LandingPage() {
  const t = useT();
  const features = [
    { icon: IconBriefcase, title: t('landing.f1.title'), body: t('landing.f1.body') },
    { icon: IconCalendar, title: t('landing.f2.title'), body: t('landing.f2.body') },
    { icon: IconDashboard, title: t('landing.f3.title'), body: t('landing.f3.body') },
  ];

  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col px-4 sm:px-6">
      <header className="flex items-center justify-between py-5">
        <Link href="/" className="flex items-center gap-2.5">
          <IconLogo />
          <span className="text-lg font-semibold tracking-tight">JobFlow</span>
        </Link>
        <div className="flex items-center gap-3">
          <LanguageSwitch />
          <ButtonLink href="/login" variant="ghost" size="sm">
            {t('landing.signIn')}
          </ButtonLink>
        </div>
      </header>

      <main className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-2">
        <section>
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">{t('app.tagline')}</h1>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/register">{t('landing.cta')}</ButtonLink>
            <ButtonLink href="/login" variant="secondary">
              {t('landing.signIn')}
            </ButtonLink>
          </div>
          <p className="mt-4 text-sm text-muted">{t('landing.demo')}</p>

          <ul className="mt-12 grid gap-6 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {features.map(({ icon: Icon, title, body }) => (
              <li key={title}>
                <div className="mb-3 grid size-9 place-items-center rounded-lg bg-primary-soft text-primary">
                  <Icon className="size-[18px]" />
                </div>
                <h2 className="text-sm font-semibold">{title}</h2>
                <p className="mt-1 text-sm text-muted">{body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-hidden className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
          <div className="mb-4 grid grid-cols-3 gap-3">
            {[
              ['12', t('dashboard.totalApplications')],
              ['64%', t('dashboard.responseRate')],
              ['2', t('dashboard.upcoming')],
            ].map(([value, label]) => (
              <div key={label} className="rounded-xl bg-surface-2 p-3">
                <p className="text-xl font-semibold">{value}</p>
                <p className="mt-0.5 truncate text-xs text-muted">{label}</p>
              </div>
            ))}
          </div>
          <ul className="divide-y divide-border rounded-xl border border-border">
            {PREVIEW.map((item) => (
              <li key={item.title} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className="truncate text-xs text-muted">{item.company}</p>
                </div>
                <StatusBadge status={item.status} />
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="py-6 text-xs text-subtle">Built with Next.js, Node.js, PostgreSQL and Prisma.</footer>
    </div>
  );
}
