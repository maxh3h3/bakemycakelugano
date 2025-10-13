import { MetadataRoute } from 'next';
import { getProducts } from '@/lib/sanity/queries';
import { locales } from '@/i18n';

/**
 * Dynamic Sitemap Generator
 * Automatically includes all pages and products in both languages
 * Updates whenever products are added/removed from Sanity
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://bakemycakelugano.ch';

  // Fetch all products from Sanity (using English locale for slugs)
  let products = [];
  try {
    products = await getProducts('en');
  } catch (error) {
    console.error('Failed to fetch products for sitemap:', error);
  }

  // Static pages for each locale
  const staticPages = [
    '',
    '/categories',
    '/products',
    '/about',
    '/contact',
    '/flavours',
    '/cart',
  ];

  // Generate URLs for all static pages in all languages
  const staticUrls: MetadataRoute.Sitemap = [];
  
  locales.forEach((locale) => {
    staticPages.forEach((page) => {
      staticUrls.push({
        url: `${baseUrl}/${locale}${page}`,
        lastModified: new Date(),
        changeFrequency: page === '' || page === '/products' ? 'daily' : 'weekly',
        priority: page === '' ? 1.0 : page === '/products' ? 0.9 : 0.7,
        alternates: {
          languages: {
            en: `${baseUrl}/en${page}`,
            it: `${baseUrl}/it${page}`,
          },
        },
      });
    });
  });

  // Generate URLs for all products in all languages
  const productUrls: MetadataRoute.Sitemap = [];
  
  products.forEach((product: any) => {
    locales.forEach((locale) => {
      productUrls.push({
        url: `${baseUrl}/${locale}/products/${product.slug.current}`,
        lastModified: product._updatedAt ? new Date(product._updatedAt) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
        alternates: {
          languages: {
            en: `${baseUrl}/en/products/${product.slug.current}`,
            it: `${baseUrl}/it/products/${product.slug.current}`,
          },
        },
      });
    });
  });

  return [...staticUrls, ...productUrls];
}

