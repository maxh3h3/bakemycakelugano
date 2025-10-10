'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

interface FooterProps {
  locale: string;
}

export default function Footer({ locale }: FooterProps) {
  const t = useTranslations('footer');
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-cream-100 border-t border-cream-200 mt-auto">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Image
                src="/images/icons/logo_BMK_no_circle.png"
                alt="Bake My Cake"
                width={32}
                height={32}
                className="object-contain"
              />
              <h3 className="font-heading text-xl font-bold text-brown-500">
                Bake My Cake
              </h3>
            </div>
            <p className="text-sm text-charcoal-900/70">
              {t('builtWith')} ❤️ {t('and')} 🎂
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-medium text-charcoal-900 mb-4">{t('quickLinks')}</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href={`/${locale}`}
                  className="text-charcoal-900/70 hover:text-brown-500 transition-colors"
                >
                  {t('home')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/products`}
                  className="text-charcoal-900/70 hover:text-brown-500 transition-colors"
                >
                  {t('products')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/about`}
                  className="text-charcoal-900/70 hover:text-brown-500 transition-colors"
                >
                  {t('about')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/contact`}
                  className="text-charcoal-900/70 hover:text-brown-500 transition-colors"
                >
                  {t('contact')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-medium text-charcoal-900 mb-4">{t('contactInfo')}</h4>
            <ul className="space-y-2 text-sm text-charcoal-900/70">
              <li>{process.env.BAKERY_EMAIL || 'info@bakemycake.com'}</li>
              <li>{process.env.BAKERY_PHONE || '+39 123 456 7890'}</li>
              <li>{process.env.BAKERY_ADDRESS || 'Via Roma 123, Milano'}</li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-8 pt-8 border-t border-cream-200 text-center text-sm text-charcoal-900/60">
          <p>
            © {currentYear} Bake My Cake. {t('allRightsReserved')}.
          </p>
        </div>
      </div>
    </footer>
  );
}

