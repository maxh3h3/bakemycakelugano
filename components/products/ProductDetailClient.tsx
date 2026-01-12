'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import type { Product } from '@/types/sanity';
import { useCartStore } from '@/store/cart-store';
import { formatPrice } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import ProductImageGallery from './ProductImageGallery';
import SizeSelector from './SizeSelector';
import FlavourSelector from './FlavourSelector';
import QuantitySelector from './QuantitySelector';

interface ProductDetailClientProps {
  product: Product;
  locale: string;
}

export default function ProductDetailClient({ product, locale }: ProductDetailClientProps) {
  const t = useTranslations('productDetail');
  const addItem = useCartStore((state) => state.addItem);

  // Form state
  const [selectedSize, setSelectedSize] = useState<string | null>(
    product.sizes && product.sizes.length > 0 ? product.sizes[0].value : null
  );
  const [selectedFlavour, setSelectedFlavour] = useState<string | null>(
    product.availableFlavours && product.availableFlavours.length > 0 ? product.availableFlavours[0]._id : null
  );
  const [quantity, setQuantity] = useState(product.minimumOrderQuantity || 1);
  const [writingOnCake, setWritingOnCake] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState<{ size?: string; flavour?: string }>({});

  // Calculate current price based on selected size
  const getCurrentPrice = () => {
    if (!selectedSize || !product.sizes) {
      return product.price;
    }
    const sizeOption = product.sizes.find((s) => s.value === selectedSize);
    return product.price + (sizeOption?.priceModifier || 0);
  };

  const currentPrice = getCurrentPrice();
  const totalPrice = currentPrice * quantity;

  // Validation
  const validate = () => {
    const newErrors: { size?: string; flavour?: string } = {};

    if (product.sizes && product.sizes.length > 0 && !selectedSize) {
      newErrors.size = t('sizeRequired');
    }

    if (product.availableFlavours && product.availableFlavours.length > 0 && !selectedFlavour) {
      newErrors.flavour = t('flavourRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle add to cart
  const handleAddToCart = async () => {
    if (!validate()) {
      return;
    }

    setIsAdding(true);

    try {
      addItem(
        product,
        quantity,
        selectedSize || undefined,
        selectedFlavour || undefined,
        writingOnCake || undefined
      );

      // Show success feedback
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      
      // Reset writing field after successful add
      setWritingOnCake('');
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Left Column - Images */}
          <div>
            <ProductImageGallery images={product.images} productName={product.name} />
          </div>

          {/* Right Column - Details */}
          <div className="space-y-6">
            {/* Product Header */}
            <div>
              {/* Category Badge */}
              {product.category && (
                <Badge variant="default" className="mb-3">
                  {product.category.name}
                </Badge>
              )}

              {/* Product Name */}
              <h1 className="font-heading text-3xl md:text-4xl font-bold text-charcoal-900 mb-4">
                {product.name}
              </h1>

              {/* Availability Badge */}
              {!product.available && (
                <Badge variant="error" className="mb-4">
                  {t('unavailable')}
                </Badge>
              )}
            </div>

            {/* Description */}
            <div className="prose prose-sm max-w-none">
              <p className="text-charcoal-900/80 leading-relaxed">{product.description}</p>
            </div>

            {/* Ingredients with Allergen Highlights */}
            {product.ingredients && product.ingredients.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-charcoal-900 mb-2">
                  {t('ingredients')}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {product.ingredients.map((ingredient, index) => (
                    <span
                      key={index}
                      className={`px-3 py-1 text-xs rounded-full font-medium ${
                        ingredient.isAllergen
                          ? 'bg-red-50 text-red-700 border border-red-100'
                          : 'bg-cream-100 text-charcoal-900'
                      }`}
                    >
                      {ingredient.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Divider */}
            <div className="border-t border-cream-200"></div>

            {/* Configuration Section */}
            <div className="space-y-6 bg-white p-6 rounded-lg shadow-sm border border-cream-200">
              {/* Size Selector */}
              {product.sizes && product.sizes.length > 0 && (
                <div>
                  <SizeSelector
                    sizes={product.sizes}
                    basePrice={product.price}
                    selectedSize={selectedSize}
                    onSizeChange={setSelectedSize}
                    required
                  />
                  {errors.size && (
                    <p className="text-xs text-rose-500 mt-1">{errors.size}</p>
                  )}
                </div>
              )}

              {/* Flavour Selector */}
              {product.availableFlavours && product.availableFlavours.length > 0 && (
                <div>
                  <FlavourSelector
                    flavours={product.availableFlavours}
                    selectedFlavour={selectedFlavour}
                    onFlavourChange={setSelectedFlavour}
                    required
                  />
                  {errors.flavour && (
                    <p className="text-xs text-rose-500 mt-1">{errors.flavour}</p>
                  )}
                </div>
              )}

              {/* Writing on Cake */}
              <div>
                <label htmlFor="writing" className="block text-sm font-semibold text-charcoal-900 mb-2">
                  {t('writingOnCake')} <span className="text-charcoal-500 font-normal">({t('optional')})</span>
                </label>
                <input
                  id="writing"
                  type="text"
                  value={writingOnCake}
                  onChange={(e) => setWritingOnCake(e.target.value)}
                  placeholder={t('writingPlaceholder')}
                  maxLength={50}
                  className="w-full px-4 py-3 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none focus:ring-2 focus:ring-brown-500/20 transition-all text-charcoal-900 placeholder:text-charcoal-400"
                />
                <p className="text-xs text-charcoal-500 mt-1">
                  {t('writingHelp')}
                </p>
              </div>

              {/* Quantity Selector */}
              <QuantitySelector
                quantity={quantity}
                onQuantityChange={setQuantity}
                minimumOrderQuantity={product.minimumOrderQuantity}
                available={product.available}
              />

              {/* Delivery Date Note */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  {t('dateNote')}
                </p>
              </div>

              {/* Total Price */}
              <div className="pt-4 border-t border-cream-200">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-semibold text-charcoal-900">{t('total')}</span>
                  <span className="text-3xl font-bold text-brown-600">
                    {formatPrice(totalPrice)}
                  </span>
                </div>

                {/* Add to Cart Button */}
                <Button
                  onClick={handleAddToCart}
                  disabled={!product.available || isAdding}
                  className="w-full"
                  size="lg"
                >
                  {isAdding ? (
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
                      {t('adding')}...
                    </>
                  ) : (
                    <>
                     {t('addToCart')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Toast */}
      {showSuccess && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-4 right-4 z-50 bg-green-500 text-white px-6 py-4 rounded-lg shadow-xl flex items-center gap-3"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="font-medium">{t('addedToCart')}</span>
        </motion.div>
      )}

      {/* Mobile Sticky Add to Cart Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t-2 border-cream-200 shadow-xl p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-charcoal-900/60">{t('total')}</p>
            <p className="text-2xl font-bold text-brown-600">{formatPrice(totalPrice)}</p>
          </div>
          <Button
            onClick={handleAddToCart}
            disabled={!product.available || isAdding}
            size="lg"
          >
            {isAdding ? t('adding') : `🛒 ${t('addToCart')}`}
          </Button>
        </div>
      </div>
    </>
  );
}

