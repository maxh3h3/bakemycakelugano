'use client';

import type { Product } from '@/types/sanity';
import ProductCard from './ProductCard';

interface ProductGridProps {
  products: Product[];
  locale: string;
}

export default function ProductGrid({ products, locale }: ProductGridProps) {
  if (!products || products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-charcoal-900/60 text-lg">
          Nessun prodotto disponibile al momento.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
      {products.map((product, index) => (
        <ProductCard key={product._id} product={product} locale={locale} index={index} />
      ))}
    </div>
  );
}
