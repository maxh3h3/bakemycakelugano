import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n';

export default createMiddleware({
  // A list of all locales that are supported
  locales,

  // Used when no locale matches
  defaultLocale,

  // Automatically detect locale from browser
  localeDetection: true,

  // Prefix the default locale in URL (e.g., /it/...)
  localePrefix: 'always',
});

export const config = {
  // Match all pathnames except for
  // - /api (API routes)
  // - /admin (Admin panel - Russian only, no locale)
  // - /studio (Sanity Studio)
  // - /_next (Next.js internals)
  // - /_vercel (Vercel internals)
  // - /images, /icons, etc. (static files)
  matcher: ['/((?!api|admin|studio|_next|_vercel|.*\\..*).*)'],
};

