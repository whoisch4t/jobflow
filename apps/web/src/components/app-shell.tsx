'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, type ComponentType, type ReactNode, type SVGProps } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useMe } from '@/lib/queries';
import { useT, type MessageKey } from '@/lib/i18n';
import { LanguageSwitch } from './language-switch';
import { NotificationsBell } from './notifications';
import {
  IconBriefcase,
  IconBuilding,
  IconCalendar,
  IconDashboard,
  IconFile,
  IconLogo,
  IconLogout,
  IconMenu,
} from './icons';

const NAV: { href: string; label: MessageKey; icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { href: '/dashboard', label: 'nav.dashboard', icon: IconDashboard },
  { href: '/applications', label: 'nav.applications', icon: IconBriefcase },
  { href: '/companies', label: 'nav.companies', icon: IconBuilding },
  { href: '/interviews', label: 'nav.interviews', icon: IconCalendar },
  { href: '/cv-versions', label: 'nav.cvVersions', icon: IconFile },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const t = useT();
  return (
    <nav className="flex flex-col gap-0.5">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={clsx(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              active ? 'bg-primary-soft text-primary' : 'text-muted hover:bg-surface-2 hover:text-fg',
            )}
          >
            <Icon className="size-[18px]" />
            {t(label)}
          </Link>
        );
      })}
    </nav>
  );
}

function UserBox() {
  const t = useT();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: user } = useMe();

  async function signOut() {
    await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
    queryClient.clear();
    router.replace('/login');
  }

  return (
    <div className="flex items-center gap-3 border-t border-border pt-4">
      <div className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
        {user?.name?.[0]?.toUpperCase() ?? '·'}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-fg">{user?.name ?? '…'}</p>
        <p className="truncate text-xs text-muted">{user?.email}</p>
      </div>
      <button
        type="button"
        onClick={signOut}
        title={t('nav.signOut')}
        aria-label={t('nav.signOut')}
        className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg"
      >
        <IconLogout />
      </button>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col gap-6 border-r border-border bg-surface px-4 py-5 lg:flex">
        <Link href="/dashboard" className="flex items-center gap-2.5 px-2">
          <IconLogo />
          <span className="text-lg font-semibold tracking-tight">JobFlow</span>
        </Link>
        <div className="flex-1">
          <NavLinks />
        </div>
        <UserBox />
      </aside>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col gap-6 bg-surface px-4 py-5 shadow-xl">
            <div className="flex items-center gap-2.5 px-2">
              <IconLogo />
              <span className="text-lg font-semibold">JobFlow</span>
            </div>
            <div className="flex-1">
              <NavLinks onNavigate={() => setMenuOpen(false)} />
            </div>
            <LanguageSwitch className="self-start" />
            <UserBox />
          </aside>
        </div>
      )}

      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-surface/85 px-4 backdrop-blur sm:px-6">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface-2 lg:hidden"
          aria-label="Menu"
        >
          <IconMenu className="size-5" />
        </button>
        <Link href="/dashboard" className="flex items-center gap-2 lg:hidden">
          <IconLogo className="size-6" />
          <span className="font-semibold">JobFlow</span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <LanguageSwitch className="hidden lg:inline-flex" />
          <NotificationsBell />
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
