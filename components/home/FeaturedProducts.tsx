import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getFeaturedProducts } from '@/lib/sanity/queries';
import ProductGrid from '@/components/products/ProductGrid';
import Button from '@/components/ui/Button';

interface FeaturedProductsProps {
  locale: string;
}

export default async function FeaturedProducts({ locale }: FeaturedProductsProps) {
  const t = await getTranslations('home');
  
  // Gracefully handle Sanity connection issues
  let products = [];
  try {
    products = await getFeaturedProducts(8); // Show 8 featured products
  } catch (error) {
    console.error('Failed to fetch featured products:', error);
    // Return empty state gracefully
  }

  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-charcoal-900 mb-4">
            {t('featuredProducts')}
          </h2>
          <p className="text-charcoal-900/70 max-w-2xl mx-auto">
            {t('featuredProductsDescription')}
          </p>
        </div>

        {/* Products Grid */}
        <ProductGrid products={products} locale={locale} />

        {/* View All Button */}
        {products.length > 0 && (
          <div className="text-center mt-12">
            <Link href={`/${locale}/products`}>
              <Button variant="secondary" size="lg">
                {t('viewAll')} →
              </Button>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

