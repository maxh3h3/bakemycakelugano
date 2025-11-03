'use client';

import { useTranslations } from 'next-intl';
import type { Product, Category } from '@/types/sanity';
import ProductCard from './ProductCard';

interface CategoryWithProducts extends Category {
  products: Product[];
}

interface ProductsGroupedProps {
  categoriesWithProducts: CategoryWithProducts[];
  locale: string;
}

export default function ProductsGrouped({ categoriesWithProducts, locale }: ProductsGroupedProps) {
  const t = useTranslations('products');

  if (!categoriesWithProducts || categoriesWithProducts.length === 0) {
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

  return (
    <div className="space-y-16">
      {categoriesWithProducts.map((category) => (
        <section key={category._id} className="scroll-mt-24" id={category.slug.current}>
          {/* Category Header */}
          <div className="mb-8">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-charcoal-900 mb-3">
              {category.name}
            </h2>
            {category.description && (
              <p className="text-charcoal-900/70 text-lg max-w-3xl">
                {category.description}
              </p>
            )}
          </div>

          {/* Products Grid for this Category */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
            {category.products.map((product, index) => (
              <ProductCard 
                key={product._id} 
                product={product} 
                locale={locale} 
                index={index} 
              />
            ))}
          </div>

          {/* Category Count */}
          <div className="mt-6 text-center">
            <p className="text-sm text-charcoal-900/50">
              {category.products.length} {category.products.length === 1 ? t('product') : t('products')}
            </p>
          </div>
        </section>
      ))}
    </div>
  );
}

