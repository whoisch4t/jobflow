// Plain module (no 'use client') so server components can read these values.
export type Locale = 'en' | 'tr';
export const LOCALES: Locale[] = ['en', 'tr'];
export const LOCALE_COOKIE = 'jf_locale';
