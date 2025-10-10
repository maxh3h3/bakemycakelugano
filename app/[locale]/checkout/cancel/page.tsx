import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Button from '@/components/ui/Button';

interface CancelPageProps {
  params: Promise<{ locale: string }>;
}

export default async function CancelPage({ params }: CancelPageProps) {
  const { locale } = await params;
  const t = await getTranslations('checkoutCancel');

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-12 md:py-16 bg-cream-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center">
            {/* Cancel Icon */}
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-100 mb-6">
              <svg
                className="w-10 h-10 text-amber-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <h1 className="font-heading text-4xl md:text-5xl font-bold text-charcoal-900 mb-4">
              {t('title')}
            </h1>
            <p className="text-xl text-charcoal-900/70 mb-8">
              {t('message')}
            </p>

            {/* Info Box */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-cream-200 mb-8">
              <div className="space-y-3 text-left text-charcoal-900/70">
                <p className="flex items-start gap-3">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Your cart items have been preserved</span>
                </p>
                <p className="flex items-start gap-3">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>No charges have been made to your account</span>
                </p>
                <p className="flex items-start gap-3">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>You can try again whenever you&apos;re ready</span>
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href={`/${locale}/cart`}>
                <Button variant="secondary" size="lg">
                  ← {t('returnToCart')}
                </Button>
              </Link>
              <Link href={`/${locale}/checkout`}>
                <Button size="lg">
                  {t('tryAgain')} →
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

