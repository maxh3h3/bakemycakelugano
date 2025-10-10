'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import Button from '@/components/ui/Button';

const heroSlides = [
  {
    image: '/images/hero/20251005_1257_Cinematic Cake Dusting_simple_compose_01k6sbmvq1ehnv1h4c7enb412k.png',
    alt: 'Artisan baker dusting cake with powdered sugar',
  },
  {
    image: '/images/hero/20251006_0947_Berry Cake Elegance_simple_compose_01k6vk6jkqexeaz8xj9gnjj6es.png',
    alt: 'Elegant berry cake display',
  },
  {
    image: '/images/hero/20251006_0947_Chocolate-Covered Smile_simple_compose_01k6vk6gynepgt6q6756hpva9a.png',
    alt: 'Chocolate covered cake with elegant presentation',
  },
  {
    image: '/images/hero/20251007_0918_Elegant Wedding Cake Display_simple_compose_01k6y3wnr7f7mbn36tryw1awy7.png',
    alt: 'Elegant wedding cake display',
  },
  {
    image: '/images/hero/20251007_0928_Mosaic Cake Creation_simple_compose_01k6y4ebhef5dtj67nee4ce9kw.png',
    alt: 'Artistic mosaic cake creation',
  },
];

interface HeroCarouselProps {
  locale: string;
}

export default function HeroCarousel({ locale }: HeroCarouselProps) {
  const t = useTranslations('home');
  
  // Create autoplay ref to control it programmatically
  const autoplayRef = useRef(
    Autoplay({ delay: 5000, stopOnInteraction: false })
  );

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, duration: 20 },
    [autoplayRef.current]
  );

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  const scrollPrev = useCallback(() => {
    if (!emblaApi) return;
    emblaApi.scrollPrev();
    // Reset autoplay timer on manual navigation
    autoplayRef.current.reset();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (!emblaApi) return;
    emblaApi.scrollNext();
    // Reset autoplay timer on manual navigation
    autoplayRef.current.reset();
  }, [emblaApi]);

  const scrollTo = useCallback((index: number) => {
    if (!emblaApi) return;
    emblaApi.scrollTo(index);
    // Reset autoplay timer on manual navigation
    autoplayRef.current.reset();
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  return (
    <div className="relative w-full h-[400px] md:h-[600px] overflow-hidden bg-cream-100">
      {/* Carousel */}
      <div className="embla h-full" ref={emblaRef}>
        <div className="embla__container h-full flex">
          {heroSlides.map((slide, index) => (
            <div key={index} className="embla__slide flex-[0_0_100%] min-w-0 relative">
              <Image
                src={slide.image}
                alt={slide.alt}
                fill
                className="object-cover"
                priority={index === 0}
                quality={90}
              />
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            </div>
          ))}
        </div>
      </div>

      {/* Content Overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-heading text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 drop-shadow-lg">
            {t('title')}
          </h1>
          <p className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl mx-auto drop-shadow-md">
            {t('subtitle')}
          </p>
          <Link href={`/${locale}/products`}>
            <Button size="lg" className="shadow-xl">
              {t('viewAll')} →
            </Button>
          </Link>
        </div>
      </div>

      {/* Navigation Arrows */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={scrollPrev}
        disabled={!canScrollPrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white transition-all duration-200 hover:bg-white/20 disabled:opacity-0 disabled:pointer-events-none"
        aria-label="Previous slide"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 19.5L8.25 12l7.5-7.5"
          />
        </svg>
      </motion.button>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={scrollNext}
        disabled={!canScrollNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white transition-all duration-200 hover:bg-white/20 disabled:opacity-0 disabled:pointer-events-none"
        aria-label="Next slide"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.25 4.5l7.5 7.5-7.5 7.5"
          />
        </svg>
      </motion.button>

      {/* Dot Indicators */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-2 z-10">
        {heroSlides.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollTo(index)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index === selectedIndex
                ? 'bg-white w-8'
                : 'bg-white/50 hover:bg-white/75'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

