import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CategoryFilter from '@/components/products/CategoryFilter';
import ProductGrid from '@/components/products/ProductGrid';
import { getProducts, getCategories, getProductsByCategory } from '@/lib/sanity/queries';
import type { Category } from '@/types/sanity';

interface ProductsPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string }>;
}

export default async function ProductsPage({ params, searchParams }: ProductsPageProps) {
  const { locale } = await params;
  const { category } = await searchParams;
  const t = await getTranslations('products');

  // Fetch categories and products
  const categories = await getCategories();
  const products = category 
    ? await getProductsByCategory(category)
    : await getProducts();

  return (
    <div className="min-h-screen flex flex-col bg-cream-50">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-cream-100 to-cream-50 py-16 md:py-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-charcoal-900 mb-4">
              {t('title')}
            </h1>
            <p className="text-lg md:text-xl text-charcoal-900/70 max-w-2xl mx-auto">
              {t('description')}
            </p>
          </div>
        </section>

        {/* Category Filter */}
        <Suspense fallback={<div className="h-24" />}>
          <CategoryFilter categories={categories} locale={locale} />
        </Suspense>

        {/* Products Grid */}
        <section className="py-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            {/* Category Title */}
            {category && (
              <h2 className="text-2xl md:text-3xl font-heading font-bold text-charcoal-900 mb-8 text-center">
                {categories.find((c: Category) => c.slug.current === category)?.name}
              </h2>
            )}
            
            {products.length > 0 ? (
              <ProductGrid products={products} locale={locale} />
            ) : (
              <div className="text-center py-20">
                <p className="text-2xl font-heading text-charcoal-900/60 mb-2">
                  {t('noProducts')}
                </p>
                <p className="text-charcoal-900/50">
                  {t('noProductsDescription')}
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

