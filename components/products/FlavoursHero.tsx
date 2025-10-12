'use client';

import { motion } from 'framer-motion';

interface FlavoursHeroProps {
  title: string;
  description: string;
}

export default function FlavoursHero({ title, description }: FlavoursHeroProps) {
  return (
    <section className="relative py-12 lg:py-16 bg-gradient-to-r from-brown-50 to-cream-100">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl lg:text-5xl font-heading font-bold text-brown-500 mb-6"
          >
            {title}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg lg:text-xl text-charcoal-700 leading-relaxed"
          >
            {description}
          </motion.p>
        </div>
      </div>
    </section>
  );
}

