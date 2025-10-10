'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';

interface QuantitySelectorProps {
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  minimumOrderQuantity?: number;
  available?: boolean;
}

export default function QuantitySelector({
  quantity,
  onQuantityChange,
  minimumOrderQuantity = 1,
  available = true,
}: QuantitySelectorProps) {
  const t = useTranslations('productDetail');

  const handleDecrease = () => {
    if (quantity > minimumOrderQuantity) {
      onQuantityChange(quantity - 1);
    }
  };

  const handleIncrease = () => {
    onQuantityChange(quantity + 1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= minimumOrderQuantity) {
      onQuantityChange(value);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-charcoal-900">
        {t('quantity')}
      </label>
      
      <div className="flex items-center gap-3">
        {/* Decrease Button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleDecrease}
          disabled={!available || quantity <= minimumOrderQuantity}
          className="w-10 h-10 rounded-lg border-2 border-cream-200 bg-white flex items-center justify-center text-charcoal-900 font-bold hover:border-brown-500 hover:text-brown-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-cream-200 disabled:hover:text-charcoal-900"
          aria-label="Decrease quantity"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
          </svg>
        </motion.button>

        {/* Quantity Input (without spinners) */}
        <input
          type="number"
          value={quantity}
          onChange={handleInputChange}
          min={minimumOrderQuantity}
          disabled={!available}
          className="w-20 h-10 text-center font-bold text-lg text-charcoal-900 border-2 border-brown-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-brown-500/20 disabled:opacity-40 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />

        {/* Increase Button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleIncrease}
          disabled={!available}
          className="w-10 h-10 rounded-lg border-2 border-cream-200 bg-white flex items-center justify-center text-charcoal-900 font-bold hover:border-brown-500 hover:text-brown-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-cream-200 disabled:hover:text-charcoal-900"
          aria-label="Increase quantity"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </motion.button>
      </div>

      {/* MOQ Warning */}
      {minimumOrderQuantity > 1 && (
        <p className="text-xs text-charcoal-900/60">
          {t('minimumOrder')}: {minimumOrderQuantity}
        </p>
      )}
    </div>
  );
}

