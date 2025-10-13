'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { urlFor } from '@/lib/sanity/image-url';

interface Ingredient {
  name: string;
  isAllergen?: boolean;
}

interface Flavour {
  _id: string;
  name: string;
  slug: { current: string };
  description?: string;
  image?: any;
  ingredients?: Ingredient[];
  available: boolean;
  order: number;
}

interface FlavourCardProps {
  flavour: Flavour;
  index: number;
}

export default function FlavourCard({ flavour, index }: FlavourCardProps) {
  const t = useTranslations('flavours');
  const isEven = index % 2 === 0;
  const imageUrl = flavour.image ? urlFor(flavour.image).width(800).height(600).url() : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.25 }}
      className={`flex flex-col ${
        isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'
      } gap-8 items-center bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300`}
    >
      {/* Image Section */}
      <div className="w-full lg:w-1/2 h-64 lg:h-96 relative overflow-hidden group">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={flavour.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-cream-100 to-cream-200 flex items-center justify-center">
            <span className="text-4xl">🍰</span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="w-full lg:w-1/2 p-8 lg:p-12">
        {/* Title */}
        <h2 className="text-3xl lg:text-4xl font-heading font-bold text-brown-500 mb-4">
          {flavour.name}
        </h2>

        {/* Description */}
        {flavour.description && (
          <p className="text-charcoal-700 text-lg mb-6 leading-relaxed">
            {flavour.description}
          </p>
        )}

        {/* Ingredients */}
        {flavour.ingredients && flavour.ingredients.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-charcoal-900 uppercase tracking-wider mb-3">
              {t('ingredients')}
            </h3>
            <div className="flex flex-wrap gap-2">
              {flavour.ingredients.map((ingredient, idx) => (
                <span
                  key={idx}
                  className={`px-3 py-1 text-sm rounded-full ${
                    ingredient.isAllergen
                      ? 'bg-red-50 text-red-700 border border-red-100'
                      : 'bg-cream-100 text-charcoal-700'
                  }`}
                >
                  {ingredient.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
