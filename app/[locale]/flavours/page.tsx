import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getFlavours } from '@/lib/sanity/queries';
import FlavourCard from '@/components/products/FlavourCard';
import FlavoursHero from '@/components/products/FlavoursHero';
import FlavoursEmpty from '@/components/products/FlavoursEmpty';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'flavours' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

interface FlavoursPageProps {
  params: Promise<{ locale: string }>;
}

export default async function FlavoursPage({ params }: FlavoursPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'flavours' });

  // Gracefully handle Sanity connection issues
  let flavours = [];
  try {
    flavours = await getFlavours();
  } catch (error) {
    console.error('Failed to fetch flavours:', error);
    // Return empty state gracefully
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gradient-to-b from-cream-50 to-white">
        {/* Hero Section */}
        <FlavoursHero title={t('title')} description={t('description')} />

        {/* Flavours Grid */}
        <section className="py-10 lg:py-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="space-y-12 lg:space-y-16 max-w-7xl mx-auto">
              {flavours.length > 0 ? (
                flavours.map((flavour: any, index: number) => (
                  <FlavourCard key={flavour._id} flavour={flavour} index={index} />
                ))
              ) : (
                <FlavoursEmpty 
                  title={t('noFlavours')} 
                  description={t('noFlavoursDescription')} 
                />
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer locale={locale} />
    </div>
  );
}

