'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import Button from '@/components/ui/Button';

interface EmptyCartProps {
  locale: string;
}

export default function EmptyCart({ locale }: EmptyCartProps) {
  const t = useTranslations('cart');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 px-4"
    >
      {/* Empty Cart Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        className="mb-8"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-32 h-32 text-brown-300"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
          />
        </svg>
      </motion.div>

      {/* Message */}
      <h2 className="font-heading text-3xl font-bold text-charcoal-900 mb-3">
        {t('empty')}
      </h2>
      <p className="text-charcoal-900/60 text-center max-w-md mb-8">
        {t('emptyDescription')}
      </p>

      {/* CTA Button */}
      <Link href={`/${locale}/products`}>
        <Button size="lg">
          {t('continueShopping')}
        </Button>
      </Link>
    </motion.div>
  );
}

