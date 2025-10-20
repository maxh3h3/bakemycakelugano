import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CategoryFilter from '@/components/products/CategoryFilter';
import ProductsSection from '@/components/products/ProductsSection';
import ProductGridSkeleton from '@/components/products/ProductGridSkeleton';
import ProductsHero from '@/components/products/ProductsHero';
import { getCategories } from '@/lib/sanity/queries';
import type { Category } from '@/types/sanity';

interface ProductsPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string }>;
}

export default async function ProductsPage({ params, searchParams }: ProductsPageProps) {
  const { locale } = await params;
  const { category } = await searchParams;
  const t = await getTranslations('products');

  // Fetch only categories (fast) - products will be fetched in ProductsSection
  const localeParam = locale as 'en' | 'it';
  const categories = await getCategories(localeParam);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <ProductsHero title={t('title')} description={t('description')} />

        {/* Category Filter */}
        <Suspense fallback={<div className="h-24" />}>
          <CategoryFilter categories={categories} locale={locale} />
        </Suspense>

        {/* Products Grid with Loading State */}
        <section className="py-10 lg:py-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            {/* Category Title */}
            {category && (
              <h2 className="text-2xl md:text-3xl font-heading font-bold text-charcoal-900 mb-8 text-center">
                {categories.find((c: Category) => c.slug.current === category)?.name}
              </h2>
            )}
            
            {/* Suspense boundary for products - shows skeleton while loading */}
            <Suspense key={category} fallback={<ProductGridSkeleton />}>
              <ProductsSection category={category} locale={locale} />
            </Suspense>
          </div>
        </section>
      </main>

      <Footer locale={locale} />
    </div>
  );
}