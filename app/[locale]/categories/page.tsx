import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getCategories } from '@/lib/sanity/queries';
import CategoryCard from '@/components/products/CategoryCard';
import CategoriesHero from '@/components/products/CategoriesHero';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import AnimatedBackground from '@/components/background/AnimatedBackground';
import type { Category } from '@/types/sanity';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'categories' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

interface CategoriesPageProps {
  params: Promise<{ locale: string }>;
}

export default async function CategoriesPage({ params }: CategoriesPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'categories' });

  // Fetch categories with locale
  let categories: Category[] = [];
  try {
    categories = await getCategories(locale as 'en' | 'it');
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    // Return empty state gracefully
  }

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Animated Background */}
      <AnimatedBackground />
      
      <Header />
      
      <main className="flex-1 relative z-10">
        {/* Hero Section */}
        <CategoriesHero title={t('title')} description={t('description')} />

        {/* Categories Grid */}
        <section className="py-10 lg:py-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            {categories.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                {categories.map((category: Category, index: number) => (
                  <CategoryCard
                    key={category._id}
                    category={category}
                    locale={locale}
                    index={index}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <p className="text-2xl font-heading text-charcoal-900/60 mb-2">
                  {t('noCategories')}
                </p>
                <p className="text-charcoal-900/50">
                  {t('noCategoriesDescription')}
                </p>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer locale={locale} />
    </div>
  );
}

