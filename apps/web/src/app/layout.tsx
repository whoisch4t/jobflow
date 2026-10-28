import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { cookies } from 'next/headers';
import type { ReactNode } from 'react';
import { LOCALE_COOKIE, type Locale } from '@/lib/i18n/config';
import { Providers } from './providers';
import './globals.css';

const inter = Inter({ subsets: ['latin', 'latin-ext'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: { default: 'JobFlow', template: '%s · JobFlow' },
  description: 'Track job applications, interviews, offers and CV versions, with analytics on what works.',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale: Locale = cookieLocale === 'tr' ? 'tr' : 'en';

  return (
    <html lang={locale} className={inter.variable}>
      <body className="min-h-dvh font-sans">
        <Providers locale={locale}>{children}</Providers>
      </body>
    </html>
  );
}
