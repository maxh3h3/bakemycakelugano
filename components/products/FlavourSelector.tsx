'use client';

import { useTranslations } from 'next-intl';
import type { Flavour } from '@/types/sanity';

interface FlavourSelectorProps {
  flavours: Flavour[];
  selectedFlavour: string | null;
  onFlavourChange: (flavourId: string) => void;
  required?: boolean;
}

export default function FlavourSelector({
  flavours,
  selectedFlavour,
  onFlavourChange,
  required = false,
}: FlavourSelectorProps) {
  const t = useTranslations('productDetail');

  if (!flavours || flavours.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <label htmlFor="flavour-select" className="block text-sm font-medium text-charcoal-900">
        {t('flavour')} {required && <span className="text-rose-500">*</span>}
      </label>
      <select
        id="flavour-select"
        value={selectedFlavour || ''}
        onChange={(e) => onFlavourChange(e.target.value)}
        className={`
          w-full px-4 py-3 rounded-lg border-2 transition-colors
          bg-white text-charcoal-900 font-medium
          focus:outline-none focus:ring-2 focus:ring-brown-500/20
          ${
            selectedFlavour
              ? 'border-brown-500'
              : 'border-cream-200 hover:border-brown-300'
          }
        `}
        required={required}
      >
        <option value="" disabled>
          {t('selectFlavour')}
        </option>
        {flavours.map((flavour) => (
          <option key={flavour._id} value={flavour._id}>
            {flavour.name}
          </option>
        ))}
      </select>
    </div>
  );
}

