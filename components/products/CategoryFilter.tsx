'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import useEmblaCarousel from 'embla-carousel-react';
import { motion } from 'framer-motion';
import type { Category } from '@/types/sanity';

interface CategoryFilterProps {
  categories: Category[];
  locale: string;
}

// Icon mapping for categories (can be customized per category name)
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
  
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: 'center',
    dragFree: true,
  });

  // Track selected index for active state
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  const handleCategoryClick = (categorySlug: string) => {
    router.push(`/${locale}/products?category=${categorySlug}`);
  };

  // Smart duplication strategy - only duplicate if needed for smooth loop
  const categoriesWithIcons = categories.map(cat => ({ ...cat, icon: getCategoryIcon(cat.name) }));
  
  // Only duplicate if we have few categories (< 8)
  // This prevents unnecessary rendering while ensuring smooth infinite scroll
  const allCategories = categoriesWithIcons.length < 8
    ? [...categoriesWithIcons, ...categoriesWithIcons]  // 2x for small lists
    : categoriesWithIcons;  // Original for larger lists

  return (
    <div className="relative w-full py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Carousel Container - Centered with max width and edge fade */}
        <div className="relative max-w-5xl mx-auto">
          {/* Embla Carousel - Taller height with gradient mask */}
          <div 
            className="embla py-4" 
            ref={emblaRef}
            style={{
              maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
              WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
            }}
          >
            <div className="embla__container">
            {allCategories.map((category, index) => {
              const isActive = category.slug.current === currentCategory;
              
              return (
                <div 
                  key={`${category._id}-${index}`} 
                  className="embla__slide flex-shrink-0" 
                  style={{ flex: '0 0 auto', paddingLeft: '0.5rem', paddingRight: '0.5rem' }}
                >
                  <motion.button
                    onClick={() => handleCategoryClick(category.slug.current)}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className={`
                      px-8 py-4
                      rounded-full 
                      font-medium 
                      text-base
                      transition-all 
                      duration-200
                      flex items-center gap-3
                      whitespace-nowrap
                      ${isActive
                        ? 'bg-brown-500 text-white shadow-lg shadow-brown-500/30'
                        : 'bg-white text-charcoal-900 shadow-md hover:shadow-lg border border-cream-200'
                      }
                    `}
                  >
                    <span className="text-xl">{category.icon}</span>
                    <span>{category.name}</span>
                  </motion.button>
                </div>
              );
            })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

