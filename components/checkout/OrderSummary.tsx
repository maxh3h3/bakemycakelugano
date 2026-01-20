'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import { enUS, it } from 'date-fns/locale';
import { useCartStore } from '@/store/cart-store';
import { urlFor } from '@/lib/sanity/image-url';
import { formatPrice } from '@/lib/utils';
import Button from '@/components/ui/Button';

interface OrderSummaryProps {
  locale: string;
  isProcessing: boolean;
  deliveryFee?: number;
}

const localeMap = {
  en: enUS,
  it: it,
};

export default function OrderSummary({ locale, isProcessing, deliveryFee = 0 }: OrderSummaryProps) {
  const t = useTranslations('checkout');
  const tCart = useTranslations('cart');
  const { items, getTotalPrice, getItemPrice } = useCartStore();

  const dateLocale = localeMap[locale as keyof typeof localeMap] || enUS;
  const subtotal = getTotalPrice();
  const totalPrice = subtotal + deliveryFee;
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-cream-200 sticky top-24">
      <h2 className="font-heading text-2xl font-bold text-charcoal-900 mb-6">
        {t('orderReview')}
      </h2>

      {/* Items List */}
      <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
        {items.map((item, index) => {
          const itemPrice = getItemPrice(item);
          const subtotal = itemPrice * item.quantity;
          
          return (
            <div key={index} className="flex gap-3 pb-4 border-b border-cream-200 last:border-0">
              {/* Image */}
              <div className="flex-shrink-0 w-16 h-16 rounded-md overflow-hidden bg-cream-100">
                <Image
                  src={urlFor(item.product.images[0]).width(100).height(100).url()}
                  alt={item.product.name}
                  width={64}
                  height={64}
                  className="object-cover"
                />
              </div>

              {/* Details */}
              <div className="flex-grow min-w-0">
                <h3 className="font-medium text-sm text-charcoal-900 line-clamp-1">
                  {item.product.name}
                </h3>
                {item.weight_kg && (
                  <p className="text-xs text-charcoal-900/60">
                    {tCart('weight')}: {item.weight_kg}
                  </p>
                )}
                {item.selectedFlavour && (
                  <p className="text-xs text-charcoal-900/60">
                    {item.product.availableFlavours?.find(f => f._id === item.selectedFlavour)?.name}
                  </p>
                )}
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-charcoal-900/60">
                    {item.quantity} × {formatPrice(itemPrice)}
                  </span>
                  <span className="text-sm font-semibold text-charcoal-900">
                    {formatPrice(subtotal)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Total */}
      <div className="border-t border-cream-200 pt-4 mb-6 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-charcoal-900/70">
            {t('subtotal')} ({totalItems} {totalItems === 1 ? t('item') : t('items')})
          </span>
          <span className="text-sm font-medium text-charcoal-900">
            {formatPrice(subtotal)}
          </span>
        </div>
        
        {deliveryFee > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-charcoal-900/70">
              {t('deliveryFee')}
            </span>
            <span className="text-sm font-medium text-charcoal-900">
              {formatPrice(deliveryFee)}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-cream-200">
          <span className="font-heading text-lg font-semibold text-charcoal-900">
            {t('orderTotal')}
          </span>
          <span className="text-2xl font-bold text-brown-600">
            {formatPrice(totalPrice)}
          </span>
        </div>
      </div>

      {/* Submit Button (Desktop) */}
      <div className="hidden lg:block">
        <Button
          type="submit"
          disabled={isProcessing}
          size="lg"
          className="w-full"
          onClick={(e) => {
            // Trigger form submission from parent form
            const form = document.querySelector('form');
            if (form) {
              form.requestSubmit();
            }
          }}
        >
          {isProcessing ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              {t('processing')}
            </>
          ) : (
            <>
              💳 {t('proceedToPayment')}
            </>
          )}
        </Button>
        <p className="text-xs text-center text-charcoal-900/60 mt-3">
          🔒 {t('paymentSecure')}
        </p>
      </div>
    </div>
  );
}

