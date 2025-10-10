import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ProductDetailClient from '@/components/products/ProductDetailClient';
import { getProductBySlug, getProducts } from '@/lib/sanity/queries';
import type { Product } from '@/types/sanity';

interface ProductPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

// Generate static params for all products
export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((product: Product) => ({
    slug: product.slug.current,
  }));
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { locale, slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
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
}

