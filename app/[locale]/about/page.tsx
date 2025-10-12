import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import AboutCard from '@/components/about/AboutCard';
import AboutHero from '@/components/about/AboutHero';

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
      <main className="flex-1">
        {/* Hero Section */}
        <AboutHero title={t('pageTitle')} subtitle={t('pageSubtitle')} />

        {/* Stories Section */}
        <section className="py-10 lg:py-12">
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

