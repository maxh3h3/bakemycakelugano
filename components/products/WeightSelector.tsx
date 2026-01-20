'use client';

import { useTranslations } from 'next-intl';
import type { ProductSize } from '@/types/sanity';
import { formatPrice } from '@/lib/utils';

interface WeightSelectorProps {
  sizes: ProductSize[];
  basePrice: number;
  selectedWeight: string | null;
  onWeightChange: (weightValue: string) => void;
  required?: boolean;
}

export default function WeightSelector({
  sizes,
  basePrice,
  selectedWeight,
  onWeightChange,
  required = false,
}: WeightSelectorProps) {
  const t = useTranslations('productDetail');

  return (
    <div className="space-y-2">
      <label htmlFor="weight-select" className="block text-sm font-medium text-charcoal-900">
        {t('weight')} {required && <span className="text-rose-500">*</span>}
      </label>
      <select
        id="weight-select"
        value={selectedWeight || ''}
        onChange={(e) => onWeightChange(e.target.value)}
        className={`
          w-full px-4 py-3 rounded-lg border-2 transition-colors
          bg-white text-charcoal-900 font-medium
          focus:outline-none focus:ring-2 focus:ring-brown-500/20
          ${
            selectedWeight
              ? 'border-brown-500'
              : 'border-cream-200 hover:border-brown-300'
          }
        `}
        required={required}
      >
        <option value="" disabled>
          {t('selectWeight')}
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
