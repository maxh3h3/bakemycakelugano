import { getTranslations } from 'next-intl/server';
import ProductGrid from './ProductGrid';
import { getProducts, getProductsByCategory } from '@/lib/sanity/queries';

interface ProductsSectionProps {
  category?: string;
  locale: string;
}

export default async function ProductsSection({ category, locale }: ProductsSectionProps) {
  const t = await getTranslations('products');
  
  // Fetch products based on category
  const localeParam = locale as 'en' | 'it';
  const products = category 
    ? await getProductsByCategory(category, localeParam)
    : await getProducts(localeParam);

  // Empty state
  if (products.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-2xl font-heading text-charcoal-900/60 mb-2">
          {t('noProducts')}
        </p>
        <p className="text-charcoal-900/50">
          {t('noProductsDescription')}
        </p>
      </div>
    );
  }

  return <ProductGrid products={products} locale={locale} />;
}


