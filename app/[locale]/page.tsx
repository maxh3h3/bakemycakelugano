import { getTranslations } from 'next-intl/server';

export default async function HomePage() {
  const t = await getTranslations('home');

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="h1 text-brown-500 mb-4">{t('title')}</h1>
        <p className="text-lg text-charcoal-900/70">
          {t('subtitle')}
        </p>
        <p className="text-sm text-charcoal-900/50 mt-4">
          {t('underConstruction')}
        </p>
      </div>
    </main>
  );
}

