'use client';

import { motion } from 'framer-motion';

interface CategoriesHeroProps {
  title: string;
  description: string;
}

export default function CategoriesHero({ title, description }: CategoriesHeroProps) {
  return (
    <section className="relative py-12 lg:py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-brown-500 mb-4"
        >
          {title}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg md:text-xl text-charcoal-900/70 max-w-2xl mx-auto"
        >
          {description}
        </motion.p>
      </div>
    </section>
  );
}

