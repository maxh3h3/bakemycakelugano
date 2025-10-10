'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { useCartStore } from '@/store/cart-store';
import { formatPrice } from '@/lib/utils';
import Button from '@/components/ui/Button';

interface CartSummaryProps {
  locale: string;
}

export default function CartSummary({ locale }: CartSummaryProps) {
  const t = useTranslations('cart');
  const { getTotalPrice, getTotalItems } = useCartStore();

  const total = getTotalPrice();
  const itemCount = getTotalItems();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-white rounded-lg p-6 shadow-sm border border-cream-200 sticky top-24"
    >
      {/* Summary Title */}
      <h2 className="font-heading text-2xl font-bold text-charcoal-900 mb-6">
        {t('title')}
      </h2>

      {/* Item Count */}
      <div className="flex justify-between items-center mb-4 pb-4 border-b border-cream-200">
        <span className="text-charcoal-900/70">
          {itemCount} {itemCount === 1 ? 'item' : 'items'}
        </span>
        <span className="text-charcoal-900 font-medium">
          {formatPrice(total)}
        </span>
      </div>

      {/* Subtotal */}
      <div className="flex justify-between items-center mb-2">
        <span className="text-charcoal-900/70">{t('subtotal')}</span>
        <span className="text-charcoal-900 font-medium">{formatPrice(total)}</span>
      </div>

      {/* Total */}
      <div className="flex justify-between items-center mb-6 pt-4 border-t-2 border-cream-200">
        <span className="text-xl font-semibold text-charcoal-900">{t('total')}</span>
        <span className="text-3xl font-bold text-brown-600">{formatPrice(total)}</span>
      </div>

      {/* Checkout Button */}
      <Link href={`/${locale}/checkout`}>
        <Button size="lg" className="w-full mb-4">
          {t('checkout')}
        </Button>
      </Link>

      {/* Continue Shopping Link */}
      <Link
        href={`/${locale}/products`}
        className="block text-center text-sm text-brown-500 hover:text-brown-600 transition-colors"
      >
        {t('continueShopping')}
      </Link>

      {/* Info Text */}
      <div className="mt-6 pt-6 border-t border-cream-200">
        <p className="text-xs text-charcoal-900/60 text-center">
          Tutti i prezzi sono in CHF (franco svizzero)
        </p>
      </div>
    </motion.div>
  );
}

