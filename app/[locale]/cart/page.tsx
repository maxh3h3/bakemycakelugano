'use client';

import { use } from 'react';
import { useTranslations } from 'next-intl';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import EmptyCart from '@/components/cart/EmptyCart';
import CartItem from '@/components/cart/CartItem';
import CartSummary from '@/components/cart/CartSummary';
import { useCartStore } from '@/store/cart-store';

interface CartPageProps {
  params: Promise<{ locale: string }>;
}

export default function CartPage({ params }: CartPageProps) {
  const { locale } = use(params);
  const t = useTranslations('cart');
  const items = useCartStore((state) => state.items);

  return (
    <div className="min-h-screen flex flex-col bg-cream-50">
      <Header />

      <main className="flex-1">
        {/* Page Header */}
        <section className="bg-white border-b border-cream-200 py-8">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="font-heading text-3xl md:text-4xl font-bold text-charcoal-900">
              {t('title')}
            </h1>
          </div>
        </section>

        {/* Discount Banner */}
        <div className="bg-red-50 border-b border-red-100">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center gap-3">
            <span className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-red-600 text-white">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M5.25 2.25a3 3 0 00-3 3v4.318a3 3 0 00.879 2.121l9.58 9.581c.92.92 2.39 1.013 3.316.05l4.37-4.37c.97-.97.876-2.44-.044-3.361L11.03 4.99A3 3 0 008.907 4.11L5.25 2.25zm4.5 6a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" clipRule="evenodd" />
              </svg>
            </span>
            <p className="text-sm font-medium text-red-700">
              {t('discountBanner')}
            </p>
          </div>
        </div>

        {/* Cart Content */}
        <section className="py-8 md:py-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            {items.length === 0 ? (
              /* Empty Cart State */
              <EmptyCart locale={locale} />
            ) : (
              /* Cart with Items */
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Cart Items (Left Side) */}
                <div className="lg:col-span-2 space-y-4">
                  {items.map((item, index) => (
                    <CartItem
                      key={`${item.product._id}-${item.weight_kg}-${item.selectedFlavour}-${index}`}
                      item={item}
                      index={index}
                      locale={locale}
                    />
                  ))}
                </div>

                {/* Cart Summary (Right Side) */}
                <div className="lg:col-span-1">
                  <CartSummary locale={locale} />
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer locale={locale} />

      {/* Mobile Sticky Checkout (only when cart has items) */}
      {items.length > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t-2 border-cream-200 shadow-xl p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-charcoal-900/50 line-through">
                {(() => {
                  const store = useCartStore.getState();
                  return `CHF ${store.getTotalPrice().toFixed(2)}`;
                })()}
              </p>
              <p className="text-2xl font-bold text-brown-600">
                {(() => {
                  const store = useCartStore.getState();
                  const discounted = store.getTotalPrice() * 0.90;
                  return `CHF ${discounted.toFixed(2)}`;
                })()}
              </p>
              <p className="text-xs font-semibold text-red-600">{t('discount')}</p>
            </div>
            <a
              href={`/${locale}/checkout`}
              className="bg-brown-500 text-cream-50 px-8 py-3 rounded-full font-semibold hover:bg-brown-600 transition-colors"
            >
              {t('checkout')}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

