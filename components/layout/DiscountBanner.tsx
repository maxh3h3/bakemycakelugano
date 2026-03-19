'use client';

import { useTranslations } from 'next-intl';

const SEPARATOR = ' ✦ ';

export default function DiscountBanner() {
  const t = useTranslations('discount');
  const text = t('bannerText');
  const segment = (text + SEPARATOR).repeat(12);

  return (
    <>
      <style>{`
        @keyframes bmk-marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .bmk-marquee-track {
          animation: bmk-marquee 70s linear infinite;
          width: max-content;
          will-change: transform;
        }
      `}</style>
      <div className="w-full bg-red-600 overflow-hidden py-4 border-b border-red-700">
        <div
          className="bmk-marquee-track flex whitespace-nowrap text-white text-base font-semibold tracking-widest uppercase select-none"
          aria-label={text}
        >
          {/* Two identical halves — animate translates the first half off-screen
              while the second half seamlessly takes its place */}
          <span aria-hidden>{segment}</span>
          <span aria-hidden>{segment}</span>
        </div>
      </div>
    </>
  );
}
