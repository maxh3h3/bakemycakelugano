import { inter, playfair } from '@/lib/fonts';

export const metadata = {
  title: 'Sanity Studio - Bake My Cake',
  description: 'Content management for Bake My Cake bakery',
};

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

