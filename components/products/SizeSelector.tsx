'use client';

import { useTranslations } from 'next-intl';
import type { ProductSize } from '@/types/sanity';
import { formatPrice } from '@/lib/utils';

interface SizeSelectorProps {
  sizes: ProductSize[];
  basePrice: number;
  selectedSize: string | null;
  onSizeChange: (sizeValue: string) => void;
  required?: boolean;
}

export default function SizeSelector({
  sizes,
  basePrice,
  selectedSize,
  onSizeChange,
  required = false,
}: SizeSelectorProps) {
  const t = useTranslations('productDetail');

  return (
    <div className="space-y-2">
      <label htmlFor="size-select" className="block text-sm font-medium text-charcoal-900">
        {t('size')} {required && <span className="text-rose-500">*</span>}
      </label>
      <select
        id="size-select"
        value={selectedSize || ''}
        onChange={(e) => onSizeChange(e.target.value)}
        className={`
          w-full px-4 py-3 rounded-lg border-2 transition-colors
          bg-white text-charcoal-900 font-medium
          focus:outline-none focus:ring-2 focus:ring-brown-500/20
          ${
            selectedSize
              ? 'border-brown-500'
              : 'border-cream-200 hover:border-brown-300'
          }
        `}
        required={required}
      >
        <option value="" disabled>
          {t('selectSize')}
        </option>
        {sizes.map((size) => {
          const totalPrice = basePrice + size.priceModifier;
          return (
            <option key={size.value} value={size.value}>
              {size.label}
              {' — '}
              {formatPrice(totalPrice)}
            </option>
          );
        })}
      </select>
    </div>
  );
}

