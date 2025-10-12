'use client';

import { motion } from 'framer-motion';
import type { Product } from '@/types/sanity';
import ProductCard from './ProductCard';

interface ProductGridProps {
  products: Product[];
  locale: string;
}

export default function ProductGrid({ products, locale }: ProductGridProps) {
  if (!products || products.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center py-12"
      >
        <p className="text-charcoal-900/60 text-lg">
          Nessun prodotto disponibile al momento.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8"
    >
      {products.map((product, index) => (
        <motion.div
          key={product._id}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 * index }}
        >
          <ProductCard product={product} locale={locale} />
        </motion.div>
      ))}
    </motion.div>
  );
}

