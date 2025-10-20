'use client';

import { motion } from 'framer-motion';

export default function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.05 }}
          className="bg-white rounded-lg overflow-hidden shadow-sm"
        >
          {/* Image Skeleton */}
          <div className="aspect-square bg-gradient-to-br from-cream-100 to-cream-200 animate-pulse" />
          
          {/* Content Skeleton */}
          <div className="p-4 space-y-3">
            {/* Category tag skeleton */}
            <div className="h-3 bg-cream-200 rounded w-1/3 animate-pulse" />
            
            {/* Product name skeleton */}
            <div className="h-5 bg-cream-200 rounded w-3/4 animate-pulse" />
            
            {/* Price skeleton */}
            <div className="h-6 bg-cream-200 rounded w-1/2 animate-pulse" />
            
            {/* Button skeleton */}
            <div className="h-9 bg-cream-200 rounded animate-pulse" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

