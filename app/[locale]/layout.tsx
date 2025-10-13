import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales } from '@/i18n';
import { inter, playfair } from '@/lib/fonts';
import AnimatedBackground from '@/components/background/AnimatedBackground';
import LocalBusinessSchema from '@/components/seo/LocalBusinessSchema';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  
  return {
    metadataBase: new URL('https://bakemycakelugano.ch'),
    title: {
      default: 'Bake My Cake - Artisan Bakery in Lugano | Custom Cakes & Pastries',
      template: '%s | Bake My Cake Lugano'
    },
    description: 'Elegant, handcrafted cakes and pastries made with love in Lugano, Switzerland. Custom wedding cakes, birthday cakes, and artisan desserts. Order online for delivery in Massagno.',
    keywords: ['bakery Lugano', 'custom cakes Lugano', 'wedding cakes Switzerland', 'artisan bakery Massagno', 'birthday cakes Lugano', 'pastries Ticino', 'cake shop Switzerland'],
    authors: [{ name: 'Bake My Cake' }],
    creator: 'Bake My Cake',
    publisher: 'Bake My Cake',
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    icons: {
      icon: '/images/icons/bmk_logo.png',
      shortcut: '/images/icons/bmk_logo.png',
      apple: '/images/icons/bmk_logo.png',
    },
    openGraph: {
      type: 'website',
      locale: locale === 'en' ? 'en_US' : 'it_IT',
      url: 'https://bakemycakelugano.ch',
      siteName: 'Bake My Cake Lugano',
      title: 'Bake My Cake - Artisan Bakery in Lugano',
      description: 'Elegant, handcrafted cakes and pastries made with love in Lugano, Switzerland.',
      images: [
        {
          url: '/images/hero/20251007_0918_Elegant Wedding Cake Display_simple_compose_01k6y3wnr7f7mbn36tryw1awy7.png',
          width: 1200,
          height: 630,
          alt: 'Bake My Cake - Artisan Bakery Lugano',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Bake My Cake - Artisan Bakery in Lugano',
      description: 'Elegant, handcrafted cakes and pastries made with love.',
      images: ['/images/hero/20251007_0918_Elegant Wedding Cake Display_simple_compose_01k6y3wnr7f7mbn36tryw1awy7.png'],
    },
    alternates: {
      canonical: `https://bakemycakelugano.ch/${locale}`,
      languages: {
        'en': 'https://bakemycakelugano.ch/en',
        'it': 'https://bakemycakelugano.ch/it',
      },
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    verification: {
      google: 'your-google-verification-code', // TODO: Add after Google Search Console setup
    },
  };
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as any)) {
    notFound();
  }

  // Providing all messages to the client side is the easiest way to get started
  const messages = await getMessages();

  return (
    <html 
      lang={locale} 
      className={`${inter.variable} ${playfair.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased">
        <LocalBusinessSchema />
        <AnimatedBackground />
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

