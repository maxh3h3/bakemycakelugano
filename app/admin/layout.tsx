import type { Metadata } from 'next';
import { inter, playfair } from '@/lib/fonts';
import '@/app/globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Админ-панель | Bake My Cake',
    template: '%s | Админ-панель Bake My Cake'
  },
  description: 'Административная панель управления Bake My Cake',
  robots: {
    index: false,
    follow: false,
  },
};

// Admin layout - no auth check here to allow login page access
// Individual pages handle their own authentication
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className={`${inter.variable} ${playfair.variable}`} suppressHydrationWarning>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
