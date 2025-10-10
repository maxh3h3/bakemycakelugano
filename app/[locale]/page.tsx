import HeroCarousel from '@/components/home/HeroCarousel';
import FeaturedProducts from '@/components/home/FeaturedProducts';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <HeroCarousel locale={locale} />
        <FeaturedProducts locale={locale} />
      </main>
      <Footer locale={locale} />
    </div>
  );
}

