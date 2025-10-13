'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import type { Category } from '@/types/sanity';
import { urlFor } from '@/lib/sanity/image-url';
import Button from '@/components/ui/Button';

interface CategoryCardProps {
  category: Category;
  locale: string;
  index?: number;
}

export default function CategoryCard({ category, locale, index = 0 }: CategoryCardProps) {
  const t = useTranslations('categories');
  
  const imageUrl = category.image
    ? urlFor(category.image).width(800).height(600).url()
    : '/images/placeholders/category.jpg';

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.2 }}
      className="group"
    >
      <Link href={`/${locale}/products?category=${category.slug.current}`}>
        <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          {/* Image Container */}
          <div className="relative aspect-[4/3] overflow-hidden bg-cream-100">
            <div className="w-full h-full relative">
              <Image
                src={imageUrl}
                alt={category.name}
                fill
                className="object-cover transition-all duration-500 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
              {/* Overlay gradient for better text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/60 via-charcoal-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Category Name */}
            <h3 className="font-heading text-2xl font-bold text-charcoal-900 mb-2 group-hover:text-brown-500 transition-colors">
              {category.name}
            </h3>

            {/* Description */}
            {category.description && (
              <p className="text-charcoal-700 text-sm mb-4 line-clamp-2">
                {category.description}
              </p>
            )}

            {/* Browse Button */}
            <Button
              className="w-full"
              size="sm"
              variant="secondary"
            >
              {t('browseCategory')}
            </Button>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

