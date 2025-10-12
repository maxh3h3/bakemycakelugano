import { MetadataRoute } from 'next';

/**
 * Robots.txt Configuration
 * Tells search engines which pages to crawl and where the sitemap is
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/studio/',
          '/checkout/',
          '/cart/',
          '/_next/',
          '/private/',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/api/',
          '/studio/',
          '/checkout/',
          '/cart/',
        ],
      },
    ],
    sitemap: 'https://bakemycakelugano.ch/sitemap.xml',
    host: 'https://bakemycakelugano.ch',
  };
}

