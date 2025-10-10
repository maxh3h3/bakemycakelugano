'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

interface AboutCardProps {
  title: string;
  story: string;
  imagePath: string;
  imageAlt: string;
  index: number;
}

export default function AboutCard({ title, story, imagePath, imageAlt, index }: AboutCardProps) {
  const isEven = index % 2 === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
      className={`flex flex-col ${
        isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'
      } gap-8 lg:gap-12 items-center`}
    >
      {/* Image Section */}
      <motion.div
        initial={{ opacity: 0, x: isEven ? -50 : 50 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
        className="w-full lg:w-1/2"
      >
        <div className="relative w-full aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl">
          <Image
            src={imagePath}
            alt={imageAlt}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
          {/* Decorative overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/20 via-transparent to-transparent" />
        </div>
      </motion.div>

      {/* Story Section */}
      <motion.div
        initial={{ opacity: 0, x: isEven ? 50 : -50 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.7, delay: 0.3, ease: 'easeOut' }}
        className="w-full lg:w-1/2"
      >
        <div className="space-y-6">
          {/* Title */}
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-3xl lg:text-4xl font-heading font-bold text-brown-500"
          >
            {title}
          </motion.h2>

          {/* Story */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="space-y-4"
          >
            {story.split('\n\n').map((paragraph, idx) => (
              <p
                key={idx}
                className="text-lg text-charcoal-700 leading-relaxed"
              >
                {paragraph}
              </p>
            ))}
          </motion.div>

          {/* Decorative element */}
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="h-1 w-20 bg-gradient-to-r from-brown-500 to-rose-400 rounded-full origin-left"
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

