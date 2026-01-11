'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { CartItem as CartItemType } from '@/store/cart-store';
import { useCartStore } from '@/store/cart-store';
import { urlFor } from '@/lib/sanity/image-url';
import { formatPrice } from '@/lib/utils';
import QuantitySelector from '@/components/products/QuantitySelector';

interface CartItemProps {
  item: CartItemType;
  index: number;
  locale: string;
}

export default function CartItem({ item, index, locale }: CartItemProps) {
  const t = useTranslations('cart');
  const { updateQuantity, removeItem, getItemPrice } = useCartStore();
  
  const [isRemoving, setIsRemoving] = useState(false);

  const itemPrice = getItemPrice(item);
  const subtotal = itemPrice * item.quantity;

  // Get the first image
  const imageUrl = item.product.images?.[0]
    ? urlFor(item.product.images[0]).width(200).height(200).url()
    : '/images/placeholders/product.jpg';

  // Get size label
  const sizeLabel = item.selectedSize && item.product.sizes
    ? item.product.sizes.find(s => s.value === item.selectedSize)?.label
    : null;

  // Get flavour name
  const flavourName = item.selectedFlavour && item.product.availableFlavours
    ? item.product.availableFlavours.find(f => f._id === item.selectedFlavour)?.name
    : null;

  const handleRemove = () => {
    setIsRemoving(true);
    setTimeout(() => {
      removeItem(index.toString());
    }, 300);
  };

  const handleQuantityChange = (newQuantity: number) => {
    updateQuantity(index.toString(), newQuantity);
  };

  return (
    <div
      className={`bg-white rounded-lg p-4 md:p-6 shadow-sm border border-cream-200 transition-opacity duration-300 ${
        isRemoving ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="flex gap-4 md:gap-6">
        {/* Product Image */}
        <div className="flex-shrink-0">
          <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-lg overflow-hidden bg-cream-100">
            <Image
              src={imageUrl}
              alt={item.product.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 80px, 96px"
            />
          </div>
        </div>

        {/* Product Details */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1">
              {/* Product Name */}
              <h3 className="font-heading text-lg md:text-xl font-semibold text-charcoal-900 mb-1">
                {item.product.name}
              </h3>

              {/* Size (if applicable) */}
              {sizeLabel && (
                <p className="text-sm text-charcoal-900/70 mb-1">
                  {t('size')}: {sizeLabel}
                </p>
              )}

              {/* Flavour (if applicable) */}
              {flavourName && (
                <p className="text-sm text-charcoal-900/70 mb-2">
                  {t('flavour')}: {flavourName}
                </p>
              )}

              {/* Unit Price */}
              <p className="text-sm text-charcoal-900/60 mb-3">
                {formatPrice(itemPrice)} {t('each')}
              </p>
            </div>

            {/* Remove Button (Desktop) */}
            <button
              onClick={handleRemove}
              className="hidden md:block p-2 text-charcoal-900/40 hover:text-rose-500 transition-colors"
              aria-label={t('remove')}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                />
              </svg>
            </button>
          </div>

          {/* Quantity Selector and Subtotal */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mt-4">
            <div className="w-32">
              <QuantitySelector
                quantity={item.quantity}
                onQuantityChange={handleQuantityChange}
                minimumOrderQuantity={item.product.minimumOrderQuantity}
                available={item.product.available}
              />
            </div>

            {/* Price and Delete - Stacked on mobile, horizontal on desktop */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              {/* Subtotal */}
              <p className="font-bold text-xl text-brown-600">
                {formatPrice(subtotal)}
              </p>

              {/* Remove Button (Mobile & Tablet) */}
              <button
                onClick={handleRemove}
                className="md:hidden self-start flex items-center gap-2 px-3 py-2 text-sm text-charcoal-900/70 hover:text-rose-500 transition-colors border border-charcoal-900/10 hover:border-rose-300 rounded-lg"
                aria-label={t('remove')}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-4 h-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                  />
                </svg>
                <span>{t('remove')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

