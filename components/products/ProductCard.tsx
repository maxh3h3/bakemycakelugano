'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import type { Product } from '@/types/sanity';
import { urlFor } from '@/lib/sanity/image-url';
import { formatPrice } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

interface ProductCardProps {
  product: Product;
  locale: string;
  index?: number;
}

export default function ProductCard({ product, locale, index = 0 }: ProductCardProps) {
  const t = useTranslations('products');
  const [imageIndex, setImageIndex] = useState(0);

  // Get image URLs from the images array
  const images = product.images || [];
  const hasMultipleImages = images.length > 1;
  
  const currentImageUrl = images[imageIndex]
    ? urlFor(images[imageIndex]).width(800).height(800).url()
    : '/images/placeholders/product.jpg';

  const handleMouseEnter = () => {
    if (hasMultipleImages) {
      setImageIndex(1); // Switch to second image on hover
    }
  };

  const handleMouseLeave = () => {
    setImageIndex(0); // Back to first image
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="group"
    >
      <Link href={`/${locale}/products/${product.slug.current}`}>
        <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          {/* Image Container */}
          <div 
            className="relative aspect-square overflow-hidden bg-cream-100"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div className="w-full h-full relative">
              <Image
                src={currentImageUrl}
                alt={product.name}
                fill
                className="object-cover transition-all duration-500 group-hover:scale-105"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />
            </div>

            {/* Badges */}
            <div className="absolute top-3 right-3 flex flex-col gap-2">
              {!product.available && (
                <Badge variant="error" className="shadow-sm">
                  {t('unavailable')}
                </Badge>
              )}
            </div>

            {/* Image Count Indicator */}
            {hasMultipleImages && (
              <div className="absolute bottom-3 left-3 flex gap-1">
                {images.map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                      idx === imageIndex 
                        ? 'bg-white w-4' 
                        : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-4">
            {/* Category */}
            {product.category && (
              <p className="text-xs text-brown-500 font-medium mb-1">
                {product.category.name}
              </p>
            )}

            {/* Product Name */}
            <h3 className="font-heading text-lg font-semibold text-charcoal-900 mb-2 line-clamp-2 group-hover:text-brown-500 transition-colors">
              {product.name}
            </h3>

            {/* Price */}
            <p className="text-2xl font-bold text-brown-600 mb-3">
              {formatPrice(product.price)}
            </p>

            {/* Order Now Button */}
            <Button
              disabled={!product.available}
              className="w-full"
              size="sm"
            >
              {t('orderNow')}
            </Button>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
