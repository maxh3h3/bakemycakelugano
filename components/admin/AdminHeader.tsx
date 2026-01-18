'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import Button from '@/components/ui/Button';
import { adminTranslations as t } from '@/lib/admin-translations';

type UserRole = 'owner' | 'cook' | 'delivery';

interface AdminHeaderProps {
  role?: UserRole | null;
}

export default function AdminHeader({ role = 'owner' }: AdminHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      const response = await fetch('/api/admin/logout', {
        method: 'POST',
      });

      if (response.ok) {
        router.push('/admin/login');
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
            href="/admin/orders"
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
              <span className="text-xs text-charcoal-500">{t.dashboard}</span>
            </div>
          </Link>

          {/* Navigation Links - Role-Based */}
          <div className="hidden md:flex items-center space-x-6">
            {role === 'owner' && (
              <>
                <Link
                  href="/admin/orders"
                  className={`text-sm font-medium transition-colors ${
                    pathname.includes('/orders')
                      ? 'text-brown-500 font-semibold'
                      : 'text-charcoal-700 hover:text-brown-500'
                  }`}
                >
                  {t.orders}
                </Link>
                <Link
                  href="/admin/clients"
                  className={`text-sm font-medium transition-colors ${
                    pathname.includes('/clients')
                      ? 'text-brown-500 font-semibold'
                      : 'text-charcoal-700 hover:text-brown-500'
                  }`}
                >
                  {t.clients}
                </Link>
                <Link
                  href="/admin/production"
                  className={`text-sm font-medium transition-colors ${
                    pathname.includes('/production')
                      ? 'text-brown-500 font-semibold'
                      : 'text-charcoal-700 hover:text-brown-500'
                  }`}
                >
                  {t.production}
                </Link>
                <Link
                  href="/admin/analytics"
                  className={`text-sm font-medium transition-colors ${
                    pathname.includes('/analytics')
                      ? 'text-brown-500 font-semibold'
                      : 'text-charcoal-700 hover:text-brown-500'
                  }`}
                >
                  {t.analytics}
                </Link>
                <Link
                  href="/admin/accounting"
                  className={`text-sm font-medium transition-colors ${
                    pathname.includes('/accounting')
                      ? 'text-brown-500 font-semibold'
                      : 'text-charcoal-700 hover:text-brown-500'
                  }`}
                >
                  {t.accounting}
                </Link>
              </>
            )}

            {role === 'cook' && (
              <Link
                href="/admin/production"
                className="text-sm font-medium text-brown-500 font-semibold"
              >
                {t.productionDashboard}
              </Link>
            )}

            {role === 'delivery' && (
              <Link
                href="/admin/deliveries"
                className="text-sm font-medium text-brown-500 font-semibold"
              >
                Доставки
              </Link>
            )}

            {/* Role Badge */}
            <div className="px-3 py-1 rounded-full text-xs font-semibold bg-brown-100 text-brown-700 border border-brown-300">
              {role === 'owner' && 'Владелец'}
              {role === 'cook' && 'Повар'}
              {role === 'delivery' && 'Доставка'}
            </div>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            {/* Logout Button */}
            <Button
              onClick={handleLogout}
              variant="secondary"
              size="sm"
              disabled={isLoggingOut}
            >
              {isLoggingOut ? t.loggingOut : t.logout}
            </Button>
          </div>
        </div>
      </nav>
    </header>
  );
}

