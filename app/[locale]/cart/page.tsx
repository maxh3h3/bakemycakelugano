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
                      key={`${item.product._id}-${item.selectedSize}-${item.selectedFlavour}-${index}`}
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
              <p className="text-sm text-charcoal-900/60">{t('total')}</p>
              <p className="text-2xl font-bold text-brown-600">
                {(() => {
                  const store = useCartStore.getState();
                  return `CHF ${store.getTotalPrice().toFixed(2)}`;
                })()}
              </p>
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

