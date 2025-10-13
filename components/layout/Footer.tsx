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
                src="/images/icons/bmk_logo.png"
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
                  href={`/${locale}/flavours`}
                  className="text-charcoal-900/70 hover:text-brown-500 transition-colors"
                >
                  {t('flavours')}
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
            <ul className="space-y-3 text-sm text-charcoal-900/70">
              <li className="flex items-start gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-4 h-4 mt-0.5 flex-shrink-0 text-brown-500"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                  />
                </svg>
                <a 
                  href="mailto:info@bakemycakelugano.ch"
                  className="hover:text-brown-500 transition-colors"
                >
                  info@bakemycakelugano.ch
                </a>
              </li>
              <li className="flex items-start gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-4 h-4 mt-0.5 flex-shrink-0 text-brown-500"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
                  />
                </svg>
                <a 
                  href="tel:+41796928888"
                  className="hover:text-brown-500 transition-colors"
                >
                  +41 79 692 8888
                </a>
              </li>
              <li className="flex items-start gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-4 h-4 mt-0.5 flex-shrink-0 text-brown-500"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                  />
                </svg>
                <a
                  href="https://maps.google.com/?q=Via+Selva+4,+Massagno+6900,+Switzerland"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-brown-500 transition-colors"
                >
                  Via Selva 4, Massagno 6900, Switzerland
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-8 pt-8 border-t border-cream-200">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-charcoal-900/60">
              © {currentYear} Bake My Cake. {t('allRightsReserved')}.
            </p>
            
            {/* Payment Methods */}
            <div className="flex items-center gap-2">
              {/* Visa */}
              <div className="bg-white px-2 py-1 rounded border border-cream-200">
                <svg className="h-4 w-auto" viewBox="0 0 750 471" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="750" height="471" fill="white"/>
                  <path d="M278.198 334.228L311.076 138.041H364.524L331.646 334.228H278.198Z" fill="#00579F"/>
                  <path d="M524.307 142.687C513.281 138.326 495.659 133.669 472.981 133.669C423.023 133.669 387.113 158.904 386.877 194.839C386.404 221.434 410.47 236.054 428.563 244.739C447.183 253.661 453.778 259.371 453.778 267.161C453.542 278.897 439.393 284.371 426.125 284.371C407.031 284.371 396.713 281.654 381.148 275.001L374.316 271.815L366.775 319.606C379.571 325.08 403.4 329.914 428.09 330.15C481.302 330.15 516.502 305.151 516.975 267.161C517.211 246.045 503.535 229.944 474.219 216.434C457.307 207.985 446.281 202.038 446.281 193.352C446.517 185.325 455.466 177.061 474.455 177.061C490.493 176.825 502.108 180.721 510.82 185.089L514.893 187.096L522.671 141.425L524.307 142.687Z" fill="#00579F"/>
                  <path d="M661.615 138.041H619.666C607.343 138.041 598.157 141.425 592.507 153.397L500.929 334.228H554.141L564.932 305.387H629.511C631.384 312.04 636.088 334.228 636.088 334.228H683.537L643.624 138.041H661.615ZM575.958 264.683C579.794 254.898 597.548 207.985 597.548 207.985C597.076 208.696 601.859 196.96 604.678 189.17L608.514 206.96L622.899 264.683H575.958Z" fill="#00579F"/>
                  <path d="M232.382 138.041L180.116 264.209L174.466 234.52C165.28 204.358 136.909 171.934 105.322 155.833L153.48 333.99H207.166L289.616 138.041H232.382Z" fill="#00579F"/>
                  <path d="M131.917 138.041H47.2583L46.5483 142.213C111.599 157.958 154.825 197.908 174.466 234.52L154.352 153.397C151.297 141.662 142.348 138.278 131.917 138.041Z" fill="#FAA61A"/>
                </svg>
              </div>

              {/* Mastercard */}
              <div className="bg-white px-2 py-1 rounded border border-cream-200">
                <svg className="h-4 w-auto" viewBox="0 0 131.39 86.9" xmlns="http://www.w3.org/2000/svg">
                  <rect fill="white" width="131.39" height="86.9"/>
                  <g>
                    <rect fill="none" width="131.39" height="86.9"/>
                    <circle fill="#eb001b" cx="45.94" cy="43.45" r="29.49"/>
                    <circle fill="#f79e1b" cx="85.45" cy="43.45" r="29.49"/>
                    <path fill="#ff5f00" d="M65.7,21.46A29.43,29.43,0,0,0,54.23,43.45,29.43,29.43,0,0,0,65.7,65.44,29.43,29.43,0,0,0,77.16,43.45,29.43,29.43,0,0,0,65.7,21.46Z"/>
                  </g>
                </svg>
              </div>

              {/* Stripe */}
              <div className="bg-white px-2 py-1 rounded border border-cream-200">
                <svg className="h-4 w-auto" viewBox="0 0 468 222.5" xmlns="http://www.w3.org/2000/svg">
                  <g fill="#635BFF">
                    <path d="M414,113.4c0-25.6-12.4-45.8-36.1-45.8c-23.8,0-38.2,20.2-38.2,45.6c0,30.1,17,45.3,41.4,45.3c11.9,0,20.9-2.7,27.7-6.5v-20c-6.8,3.4-14.6,5.5-24.5,5.5c-9.7,0-18.3-3.4-19.4-15.2h48.9C413.8,121,414,115.8,414,113.4z M364.6,103.9c0-11.3,6.9-16,13.2-16c6.1,0,12.6,4.7,12.6,16H364.6z"/>
                    <path d="M301.1,67.6c-9.8,0-16.1,4.6-19.6,7.8l-1.3-6.2h-22v116.6l25-5.3l0.1-28.3c3.6,2.6,8.9,6.3,17.7,6.3c17.9,0,34.2-14.4,34.2-46.1C335.1,83.4,318.6,67.6,301.1,67.6z M295.1,136.5c-5.9,0-9.4-2.1-11.8-4.7l-0.1-37.1c2.6-2.9,6.2-4.9,11.9-4.9c9.1,0,15.4,10.2,15.4,23.3C310.5,126.5,304.3,136.5,295.1,136.5z"/>
                    <polygon points="223.8,61.7 248.9,56.3 248.9,36 223.8,41.3 "/>
                    <rect x="223.8" y="69.3" width="25.1" height="87.5"/>
                    <path d="M196.9,76.7l-1.6-7.4h-21.6v87.5h25V97.5c5.9-7.7,15.9-6.3,19-5.2v-23C214.5,68.1,202.8,65.9,196.9,76.7z"/>
                    <path d="M146.9,47.6l-24.4,5.2l-0.1,80.1c0,14.8,11.1,25.7,25.9,25.7c8.2,0,14.2-1.5,17.5-3.3V135c-3.2,1.3-19,5.9-19-8.9V90.6h19V69.3h-19L146.9,47.6z"/>
                    <path d="M79.3,94.7c0-3.9,3.2-5.4,8.5-5.4c7.6,0,17.2,2.3,24.8,6.4V72.2c-8.3-3.3-16.5-4.6-24.8-4.6C67.5,67.6,54,78.2,54,95.9c0,27.6,38,23.2,38,35.1c0,4.6-4,6.1-9.6,6.1c-8.3,0-18.9-3.4-27.3-8v23.8c9.3,4,18.7,5.7,27.3,5.7c20.8,0,35.1-10.3,35.1-28.2C117.4,100.6,79.3,105.9,79.3,94.7z"/>
                  </g>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

