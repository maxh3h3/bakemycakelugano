/**
 * Local Business Structured Data
 * 
 * Implements Schema.org markup for local business SEO
 * Helps Google show rich snippets with:
 * - Business hours
 * - Location on maps
 * - Contact information
 * - Ratings (when you have reviews)
 */
export default function LocalBusinessSchema() {
  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'Bakery',
    '@id': 'https://bakemycakelugano.ch/#bakery',
    name: 'Bake My Cake',
    image: 'https://bakemycakelugano.ch/images/hero/20251007_0918_Elegant Wedding Cake Display_simple_compose_01k6y3wnr7f7mbn36tryw1awy7.png',
    description: 'Elegant, handcrafted cakes and pastries made with love in Lugano, Switzerland. Custom wedding cakes, birthday cakes, and artisan desserts.',
    url: 'https://bakemycakelugano.ch',
    telephone: '+41796928888',
    email: 'info@bakemycakelugano.ch',
    priceRange: '$$',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Via Selva 4',
      addressLocality: 'Massagno',
      addressRegion: 'Ticino',
      postalCode: '6900',
      addressCountry: 'CH',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 46.0116,
      longitude: 8.9416,
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '09:00',
        closes: '18:00',
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: 'Saturday',
        opens: '09:00',
        closes: '16:00',
      },
    ],
    sameAs: [
      // TODO: Add your social media profiles
      // 'https://www.facebook.com/bakemycakelugano',
      // 'https://www.instagram.com/bakemycakelugano',
      // 'https://www.linkedin.com/company/bakemycakelugano',
    ],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Bakery Products',
      itemListElement: [
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Product',
            name: 'Custom Wedding Cakes',
            description: 'Elegant custom wedding cakes made to order',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Product',
            name: 'Birthday Cakes',
            description: 'Handcrafted birthday cakes in various flavors',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Product',
            name: 'Artisan Pastries',
            description: 'Fresh, handmade pastries and desserts',
          },
        },
      ],
    },
    // Add this when you have reviews
    // aggregateRating: {
    //   '@type': 'AggregateRating',
    //   ratingValue: '4.9',
    //   reviewCount: '47',
    // },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
    />
  );
}

