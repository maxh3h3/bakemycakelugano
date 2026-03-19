'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';

const STORAGE_KEY = 'bmk_discount_modal_dismissed';

interface DiscountModalProps {
  locale: string;
}

export default function DiscountModal({ locale }: DiscountModalProps) {
  const t = useTranslations('discountModal');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem(STORAGE_KEY)) {
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  // Lock scroll while modal is open
  useEffect(() => {
    if (visible) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [visible]);

  function dismiss() {
    sessionStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="discount-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
          onClick={dismiss}
        >
          <motion.div
            key="discount-modal-card"
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={dismiss}
              aria-label="Close"
              className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Cake image — anchored to bottom, ~10% cropped from top */}
            <div className="relative w-full h-[280px] sm:h-[460px]">
              <Image
                src="/images/discount/red_cake_discount_modal.jpg"
                alt="Bake My Cake — 10% off"
                fill
                className="object-cover object-bottom"
                priority
              />
            </div>

            {/* Content */}
            <div className="px-7 pt-5 pb-7 text-center">
              {/* Badge */}
              <span className="inline-block px-3 py-1 rounded-full bg-red-50 text-red-600 text-xs font-bold tracking-widest uppercase mb-3 border border-red-200">
                {t('badge')}
              </span>

              {/* Headline */}
              <h2 className="font-heading text-3xl font-bold text-charcoal-900 leading-tight mb-2">
                {t('headline')}
              </h2>

              {/* Subtext */}
              <p className="text-sm text-charcoal-900/60 mb-6 leading-relaxed">
                {t('subtext')}
              </p>

              {/* CTA */}
              <Link
                href={`/${locale}/products`}
                onClick={dismiss}
                className="block w-full rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold text-sm py-3.5 transition-colors"
              >
                {t('cta')}
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
