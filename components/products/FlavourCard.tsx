'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
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

  // Get allergens
  const allergens = flavour.ingredients?.filter((ing) => ing.isAllergen) || [];
  const regularIngredients = flavour.ingredients?.filter((ing) => !ing.isAllergen) || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={`flex flex-col ${
        isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'
      } gap-8 items-center bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300`}
    >
      {/* Image Section */}
      <motion.div
        initial={{ opacity: 0, x: isEven ? -50 : 50 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
        className="w-full lg:w-1/2 h-64 lg:h-96 relative"
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={flavour.name}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-cream-100 to-cream-200 flex items-center justify-center">
            <span className="text-4xl">🍰</span>
          </div>
        )}
      </motion.div>

      {/* Content Section */}
      <motion.div
        initial={{ opacity: 0, x: isEven ? 50 : -50 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
        className="w-full lg:w-1/2 p-8 lg:p-12"
      >
        {/* Title */}
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-3xl lg:text-4xl font-heading font-bold text-brown-500 mb-4"
        >
          {flavour.name}
        </motion.h2>

        {/* Description */}
        {flavour.description && (
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="text-charcoal-700 text-lg mb-6 leading-relaxed"
          >
            {flavour.description}
          </motion.p>
        )}

        {/* Ingredients */}
        {regularIngredients.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mb-6"
          >
            <h3 className="text-sm font-semibold text-charcoal-900 uppercase tracking-wider mb-3">
              {t('ingredients')}
            </h3>
            <div className="flex flex-wrap gap-2">
              {regularIngredients.map((ingredient, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-cream-100 text-charcoal-700 text-sm rounded-full"
                >
                  {ingredient.name}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Allergens */}
        {allergens.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="mb-4"
          >
            <h3 className="text-sm font-semibold text-rose-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
              {t('allergens')}
            </h3>
            <div className="flex flex-wrap gap-2">
              {allergens.map((allergen, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-rose-50 text-rose-700 text-sm rounded-full border border-rose-200 font-medium"
                >
                  {allergen.name}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

