import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getFlavours } from '@/lib/sanity/queries';
import FlavourCard from '@/components/products/FlavourCard';
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
        <section className="relative py-16 lg:py-24 bg-gradient-to-r from-brown-50 to-cream-100">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl lg:text-5xl font-heading font-bold text-brown-500 mb-6">
                Our Flavours
              </h1>
              <p className="text-lg lg:text-xl text-charcoal-700 leading-relaxed">
                Discover our handcrafted flavours, each made with premium ingredients and traditional techniques.
              </p>
            </div>
          </div>
        </section>

        {/* Flavours Grid */}
        <section className="py-16 lg:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="space-y-12 lg:space-y-16 max-w-7xl mx-auto">
              {flavours.length > 0 ? (
                flavours.map((flavour: any, index: number) => (
                  <FlavourCard key={flavour._id} flavour={flavour} index={index} />
                ))
              ) : (
                <div className="text-center py-16">
                  <div className="text-6xl mb-4">🍰</div>
                  <h3 className="text-2xl font-heading font-bold text-charcoal-900 mb-2">
                    No Flavours Available
                  </h3>
                  <p className="text-charcoal-600">
                    We&apos;re currently updating our flavour selection. Please check back soon!
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer locale={locale} />
    </div>
  );
}

