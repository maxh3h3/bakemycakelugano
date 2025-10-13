import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ProductDetailClient from '@/components/products/ProductDetailClient';
import { getProductBySlug, getProducts } from '@/lib/sanity/queries';
import { locales } from '@/i18n';
import type { Product } from '@/types/sanity';

interface ProductPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

// Generate static params for all products in all locales
// Important: Must return BOTH locale and slug since route is /[locale]/products/[slug]
export async function generateStaticParams() {
  try {
    // Use English locale to get all product slugs (slugs are language-neutral)
    const products = await getProducts('en');
    
    // Generate all combinations of locale + slug
    const params = locales.flatMap((locale) =>
      products.map((product: Product) => ({
        locale,
        slug: product.slug.current,
      }))
    );
    
    console.log(`✅ Generated ${params.length} static product pages (${products.length} products × ${locales.length} locales)`);
    return params;
  } catch (error) {
    console.error('❌ Error generating static params:', error);
    // Return empty array to allow build to continue
    return [];
  }
}

// Enable dynamic rendering for product slugs not in static params
export const dynamicParams = true;

export default async function ProductPage({ params }: ProductPageProps) {
  try {
    const { locale, slug } = await params;
    
    // Enable static rendering for next-intl
    setRequestLocale(locale);
    
    console.log(`📦 Fetching product with slug: ${slug} for locale: ${locale}`);
    const product = await getProductBySlug(slug, locale as 'en' | 'it');

    if (!product) {
      console.warn(`⚠️ Product not found: ${slug}`);
      notFound();
    }

    const t = await getTranslations('productDetail');

    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        
        <main className="flex-1 bg-cream-50">
          {/* Breadcrumb */}
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <nav className="flex items-center gap-2 text-sm text-charcoal-900/60">
              <a href={`/${locale}`} className="hover:text-brown-500 transition-colors">
                {t('home')}
              </a>
              <span>/</span>
              <a href={`/${locale}/products`} className="hover:text-brown-500 transition-colors">
                {t('products')}
              </a>
              <span>/</span>
              <span className="text-charcoal-900 font-medium">{product.name}</span>
            </nav>
          </div>

          {/* Product Detail */}
          <ProductDetailClient product={product} locale={locale} />
        </main>

        <Footer locale={locale} />
      </div>
    );
  } catch (error) {
    console.error('❌ Error rendering product page:', error);
    // Re-throw to trigger Next.js error handling
    throw error;
  }
}

