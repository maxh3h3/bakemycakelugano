import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import AboutCard from '@/components/about/AboutCard';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'about' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

interface AboutPageProps {
  params: Promise<{ locale: string }>;
}

export default async function AboutPage({ params }: AboutPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'about' });

  const stories = [
    {
      title: t('story1Title'),
      story: t('story1Text'),
      imagePath: '/images/about/iryna-portrait.jpg',
      imageAlt: 'Iryna creating beautiful cakes',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gradient-to-b from-cream-50 to-white">
        {/* Hero Section */}
        <section className="relative py-16 lg:py-24 bg-gradient-to-r from-brown-50 via-cream-100 to-rose-50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl lg:text-5xl font-heading font-bold text-brown-500 mb-6">
                {t('pageTitle')}
              </h1>
              <p className="text-lg lg:text-xl text-charcoal-700 leading-relaxed">
                {t('pageSubtitle')}
              </p>
            </div>
          </div>
        </section>

        {/* Stories Section */}
        <section className="py-16 lg:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto space-y-24 lg:space-y-32">
              {stories.map((story, index) => (
                <AboutCard
                  key={index}
                  title={story.title}
                  story={story.story}
                  imagePath={story.imagePath}
                  imageAlt={story.imageAlt}
                  index={index}
                />
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer locale={locale} />
    </div>
  );
}

