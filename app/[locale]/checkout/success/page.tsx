import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Button from '@/components/ui/Button';
import { stripe } from '@/lib/stripe/server';
import { supabaseAdmin } from '@/lib/supabase/server';

interface SuccessPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ session_id?: string }>;
}

export default async function SuccessPage({ params, searchParams }: SuccessPageProps) {
  const { locale } = await params;
  const { session_id } = await searchParams;
  const t = await getTranslations('checkoutSuccess');
  const tCheckout = await getTranslations('checkout');

  // If no session_id, redirect to home
  if (!session_id) {
    redirect(`/${locale}`);
  }

  let session: any = null;
  let order: any = null;

  try {
    // Check if stripe is properly initialized
    if (!process.env.STRIPE_SECRET_KEY || !stripe) {
      console.error('STRIPE_SECRET_KEY is not configured');
    } else {
      // Retrieve the Stripe session
      session = await stripe.checkout.sessions.retrieve(session_id);
    }

    // Retrieve order from database
    // Note: Order might not exist yet if webhook hasn't processed
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        order_items (*)
      `)
      .eq('stripe_session_id', session_id)
      .maybeSingle(); // Use maybeSingle() instead of single() to handle 0 results

    if (error) {
      console.error('Error fetching order:', error);
    } else if (data) {
      order = data;
    } else {
      console.log('Order not found yet - webhook may still be processing');
    }
  } catch (error) {
    console.error('Error retrieving session:', error);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-12 md:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            {/* Success Icon */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6">
                <svg
                  className="w-10 h-10 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h1 className="font-heading text-4xl md:text-5xl font-bold text-charcoal-900 mb-4">
                {t('title')}
              </h1>
              <p className="text-xl text-charcoal-900/70 mb-2">
                {t('thankYou')}
              </p>
              <p className="text-charcoal-900/60">
                {t('orderReceived')}
              </p>
            </div>

            {/* Processing Notice (if order not found yet) */}
            {!order && session && (
              <div className="bg-yellow-50 rounded-lg p-6 mb-8 border border-yellow-200">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-yellow-100 mb-4">
                    <svg className="w-6 h-6 text-yellow-600 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  <p className="text-sm text-yellow-900 font-medium mb-2">
                    {t('processing') || 'Processing your order...'}
                  </p>
                  <p className="text-xs text-yellow-800">
                    {t('processingNote') || 'Your order details will appear here shortly. Please refresh the page in a few moments.'}
                  </p>
                </div>
              </div>
            )}

            {/* Order Details */}
            {order && (
              <div className="bg-white rounded-lg shadow-sm p-6 md:p-8 border border-cream-200 mb-8">
                <h2 className="font-heading text-2xl font-bold text-charcoal-900 mb-6">
                  {t('orderDetails')}
                </h2>

                {/* Order Number */}
                <div className="mb-6 pb-6 border-b border-cream-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-charcoal-900">
                      {t('orderNumber')}
                    </span>
                    <span className="font-mono text-sm text-charcoal-900 bg-cream-100 px-3 py-1 rounded">
                      {order.id.slice(0, 8).toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Customer Info */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-charcoal-900 mb-3">
                    {tCheckout('customerInfo')}
                  </h3>
                  <div className="space-y-2 text-sm text-charcoal-900/70">
                    <p>{order.customer_name}</p>
                    <p>{order.customer_email}</p>
                    {order.customer_phone && <p>{order.customer_phone}</p>}
                  </div>
                </div>

                {/* Delivery Info */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-charcoal-900 mb-3">
                    {tCheckout('deliveryInfo')}
                  </h3>
                  <div className="text-sm text-charcoal-900/70">
                    {order.delivery_type === 'pickup' ? (
                      <p>🏪 {tCheckout('pickup')}</p>
                    ) : (
                      <div className="space-y-1">
                        <p>🚚 {tCheckout('delivery')}</p>
                        <p>{order.delivery_address}</p>
                        <p>
                          {order.delivery_postal_code} {order.delivery_city}
                        </p>
                        {order.delivery_country && <p>{order.delivery_country}</p>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Order Items */}
                {order.order_items && order.order_items.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-charcoal-900 mb-3">
                      {tCheckout('items')}
                    </h3>
                    <div className="space-y-3">
                      {order.order_items.map((item: any) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <div className="flex-grow">
                            <p className="font-medium text-charcoal-900">
                              {item.quantity}× {item.product_name}
                            </p>
                            {item.size_label && (
                              <p className="text-xs text-charcoal-900/60">
                                {item.size_label}
                              </p>
                            )}
                            {item.delivery_date && (
                              <p className="text-xs text-charcoal-900/60">
                                📅 {new Date(item.delivery_date).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-charcoal-900">
                              CHF {item.subtotal.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Total */}
                <div className="pt-6 border-t border-cream-200">
                  <div className="flex items-center justify-between">
                    <span className="font-heading text-lg font-semibold text-charcoal-900">
                      {tCheckout('orderTotal')}
                    </span>
                    <span className="text-2xl font-bold text-brown-600">
                      CHF {order.total_amount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Confirmation Email Notice */}
            {session && (
              <div className="bg-blue-50 rounded-lg p-4 mb-8 border border-blue-200">
                <p className="text-sm text-blue-900 text-center">
                  📧 {t('confirmationEmail')} <strong>{session.customer_email}</strong>
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="text-center">
              <Link href={`/${locale}/products`}>
                <Button size="lg">
                  {t('continueShopping')} →
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer locale={locale} />
    </div>
  );
}

