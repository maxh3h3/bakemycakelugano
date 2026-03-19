'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useCartStore } from '@/store/cart-store';
import { formatPrice } from '@/lib/utils';
import Button from '@/components/ui/Button';

interface CartSummaryProps {
  locale: string;
}

export default function CartSummary({ locale }: CartSummaryProps) {
  const t = useTranslations('cart');
  const { getTotalPrice } = useCartStore();

  const subtotal = getTotalPrice();
  const discountAmount = subtotal * 0.10;
  const discountedTotal = subtotal - discountAmount;

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-cream-200 sticky top-24">
      {/* Summary Title */}
      <h2 className="font-heading text-2xl font-bold text-charcoal-900 mb-6">
        {t('title')}
      </h2>

      {/* Price breakdown */}
      <div className="space-y-3 mb-4">
        {/* Original subtotal */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-charcoal-900/70">{t('subtotal')}</span>
          <span className="text-sm text-charcoal-900/50 line-through">
            {formatPrice(subtotal)}
          </span>
        </div>

        {/* Discount row */}
        <div className="flex justify-between items-center bg-red-50 rounded-md px-3 py-2 border border-red-200">
          <span className="text-sm font-semibold text-red-600">
            {t('discount')}
          </span>
          <span className="text-sm font-bold text-red-600">
            −{formatPrice(discountAmount)}
          </span>
        </div>
      </div>

      {/* Total */}
      <div className="flex justify-between items-center mb-6 pt-4 border-t-2 border-cream-200">
        <span className="text-xl font-semibold text-charcoal-900">{t('total')}</span>
        <span className="text-3xl font-bold text-brown-600">{formatPrice(discountedTotal)}</span>
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

      {/* Delivery note */}
      <div className="mt-6 pt-6 border-t border-cream-200">
        <p className="text-xs text-charcoal-900/50 text-center">
          {t('deliveryNote')}
        </p>
      </div>
    </div>
  );
}
