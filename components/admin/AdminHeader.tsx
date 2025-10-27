'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Button from '@/components/ui/Button';
import LanguageSwitcher from '@/components/layout/LanguageSwitcher';

export default function AdminHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('admin');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  // Extract locale from pathname
  const locale = pathname.split('/')[1] || 'en';

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      const response = await fetch('/api/admin/logout', {
        method: 'POST',
      });

      if (response.ok) {
        router.push(`/${locale}/admin/login`);
        router.refresh();
      }
    } catch (error) {
      console.error('Logout error:', error);
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="bg-white border-b-2 border-cream-200 sticky top-0 z-50 shadow-sm">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and Title */}
          <Link
            href={`/${locale}/admin/orders`}
            className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
          >
            <Image
              src="/images/icons/bmk_logo.png"
              alt="Bake My Cake"
              width={36}
              height={36}
              className="object-contain"
            />
            <div>
              <span className="text-lg font-heading font-bold text-brown-500 block">
                Bake My Cake
              </span>
              <span className="text-xs text-charcoal-500">{t('dashboard')}</span>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-6">
            <Link
              href={`/${locale}/admin/orders`}
              className="text-sm font-medium text-charcoal-700 hover:text-brown-500 transition-colors"
            >
              {t('orders')}
            </Link>
            <Link
              href={`/${locale}/admin/analytics`}
              className="text-sm font-medium text-charcoal-700 hover:text-brown-500 transition-colors"
            >
              {t('analytics')}
            </Link>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            {/* Language Switcher */}
            <LanguageSwitcher />
            
            {/* Logout Button */}
            <Button
              onClick={handleLogout}
              variant="secondary"
              size="sm"
              disabled={isLoggingOut}
            >
              {isLoggingOut ? t('loggingOut') : t('logout')}
            </Button>
          </div>
        </div>
      </nav>
    </header>
  );
}

