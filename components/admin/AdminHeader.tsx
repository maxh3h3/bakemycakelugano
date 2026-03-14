'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import Button from '@/components/ui/Button';
import { adminTranslations as t } from '@/lib/admin-translations';

type UserRole = 'owner' | 'cook' | 'delivery';

interface AdminHeaderProps {
  role?: UserRole | null;
}

interface NavLink {
  href: string;
  label: string;
  match: string;
}

function getNavLinks(role: UserRole | null | undefined): NavLink[] {
  if (role === 'owner') {
    return [
      { href: '/admin/orders', label: t.orders, match: '/orders' },
      { href: '/admin/clients', label: t.clients, match: '/clients' },
      { href: '/admin/meetings', label: 'Встречи', match: '/meetings' },
      { href: '/admin/production', label: t.production, match: '/production' },
      { href: '/admin/delivery', label: 'Доставки', match: '/delivery' },
      { href: '/admin/accounting', label: t.accounting, match: '/accounting' },
    ];
  }
  if (role === 'cook') {
    return [
      { href: '/admin/production', label: t.productionDashboard, match: '/production' },
      { href: '/admin/delivery', label: 'Доставки', match: '/delivery' },
    ];
  }
  if (role === 'delivery') {
    return [{ href: '/admin/delivery', label: 'Доставки', match: '/delivery' }];
  }
  return [];
}

const roleBadgeLabel: Record<UserRole, string> = {
  owner: 'Владелец',
  cook: 'Повар',
  delivery: 'Доставка',
};

export default function AdminHeader({ role = 'owner' }: AdminHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const response = await fetch('/api/admin/logout', { method: 'POST' });
      if (response.ok) {
        router.push('/admin/login');
        router.refresh();
      }
    } catch (error) {
      console.error('Logout error:', error);
      setIsLoggingOut(false);
    }
  };

  const navLinks = getNavLinks(role);

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

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-6">
            {navLinks.map(({ href, label, match }) => (
              <Link
                key={href}
                href={href}
                className={`text-sm font-medium transition-colors ${
                  pathname.includes(match)
                    ? 'text-brown-500 font-semibold'
                    : 'text-charcoal-700 hover:text-brown-500'
                }`}
              >
                {label}
              </Link>
            ))}

            {role && (
              <div className="px-3 py-1 rounded-full text-xs font-semibold bg-brown-100 text-brown-700 border border-brown-300">
                {roleBadgeLabel[role]}
              </div>
            )}
          </div>

          {/* Right Side: Hamburger (mobile) + Logout */}
          <div className="flex items-center space-x-2">
            {/* Hamburger button — mobile only */}
            <button
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-charcoal-700 hover:text-brown-500 hover:bg-cream-100 transition-colors"
              aria-label={mobileMenuOpen ? 'Закрыть меню' : 'Открыть меню'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                /* X icon */
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                /* Hamburger icon */
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>

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

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-cream-200 bg-white">
          <div className="px-4 pt-2 pb-4 space-y-1">
            {/* Role badge */}
            {role && (
              <div className="px-3 py-2 mb-2">
                <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-brown-100 text-brown-700 border border-brown-300">
                  {roleBadgeLabel[role]}
                </span>
              </div>
            )}

            {navLinks.map(({ href, label, match }) => (
              <Link
                key={href}
                href={href}
                className={`block px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  pathname.includes(match)
                    ? 'bg-brown-50 text-brown-500 font-semibold'
                    : 'text-charcoal-700 hover:bg-cream-50 hover:text-brown-500'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

