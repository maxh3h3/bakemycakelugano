'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import type { Category } from '@/types/sanity';

interface CategoryFilterProps {
  categories: Category[];
  locale: string;
}

// Icon mapping for categories
const getCategoryIcon = (categoryName: string): string => {
  const lowerName = categoryName.toLowerCase();
  if (lowerName.includes('cake') || lowerName.includes('torte')) return '🎂';
  if (lowerName.includes('pastry') || lowerName.includes('pasticceria')) return '🥐';
  if (lowerName.includes('cookie') || lowerName.includes('biscotti')) return '🍪';
  if (lowerName.includes('bread') || lowerName.includes('pane')) return '🥖';
  if (lowerName.includes('tart') || lowerName.includes('crostat')) return '🥧';
  if (lowerName.includes('cupcake') || lowerName.includes('muffin')) return '🧁';
  if (lowerName.includes('macaron')) return '🍬';
  if (lowerName.includes('chocolate') || lowerName.includes('cioccolat')) return '🍫';
  return '✨'; // Default icon
};

export default function CategoryFilter({ categories, locale }: CategoryFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentCategory = searchParams.get('category');
  
  // Optimistic UI: Track which category user clicked (instant feedback)
  const [optimisticCategory, setOptimisticCategory] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleCategoryClick = (categorySlug: string) => {
    // Immediately update UI (optimistic)
    setOptimisticCategory(categorySlug);
    
    // Navigate in background without blocking UI
    startTransition(() => {
      router.push(`/${locale}/products?category=${categorySlug}`);
    });
  };

  // Show optimistic state while navigation is pending, then show actual state
  const activeCategory = isPending ? optimisticCategory : currentCategory;

  const categoriesWithIcons = categories.map(cat => ({ 
    ...cat, 
    icon: getCategoryIcon(cat.name) 
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="relative w-full py-12"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Native horizontal scroll with snap points */}
        <div className="relative max-w-5xl mx-auto">
          <div 
            className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4 px-4"
            style={{
              maskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)',
              WebkitMaskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {categoriesWithIcons.map((category) => {
              const isActive = category.slug.current === activeCategory;
              
              return (
                <button
                  key={category._id}
                  onClick={() => handleCategoryClick(category.slug.current)}
                  disabled={isPending && optimisticCategory === category.slug.current}
                  className={`
                    snap-center
                    flex-shrink-0
                    px-8 py-4
                    rounded-full 
                    font-medium 
                    text-base
                    transition-all 
                    duration-200
                    flex items-center gap-3
                    whitespace-nowrap
                    hover:scale-105
                    active:scale-98
                    disabled:opacity-70
                    ${isActive
                      ? 'bg-brown-500 text-white shadow-lg shadow-brown-500/30 scale-105'
                      : 'bg-white text-charcoal-900 shadow-md hover:shadow-lg border border-cream-200'
                    }
                  `}
                >
                  <span className="text-xl">{category.icon}</span>
                  <span>{category.name}</span>
                  {isPending && optimisticCategory === category.slug.current && (
                    <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Custom scrollbar hide CSS */}
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </motion.div>
  );
}
