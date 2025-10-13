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
    image: '/images/hero/57b41089-f16c-483e-b1fe-479c553b528e.JPG',
    alt: 'Iryna holding a handcrafted cake',
    storyKey: 'story3',
  },
  {
    image: '/images/hero/9e717507-7d58-4168-85b4-d5a56d0b2aac.JPG',
    alt: 'Personalized elegant cake with flowers',
    storyKey: 'story2',
  },
  {
    image: '/images/hero/0d981074-8359-4d2c-8174-63ad6061f9fb.JPG',
    alt: 'Children learning to bake in masterclass',
    storyKey: 'story1',
  },
  {
    image: '/images/hero/821e2804-526c-48eb-8a71-a48a3af7cb70.JPG',
    alt: 'Close-up of hands in baking process',
    storyKey: 'story4',
  },
  {
    image: '/images/hero/79545d1f-f09a-4006-90f0-5cd89e9ebd3b.JPG',
    alt: 'Decorating chocolate cupcakes with blueberries',
    storyKey: 'story5',
  },
  {
    image: '/images/hero/acb6e178-1242-4162-8c6b-454ec1a28483.JPG',
    alt: 'Chocolate cake slice with roses',
    storyKey: 'story6',
  },
  {
    image: '/images/hero/c2f7e4a8-7f75-4cd5-b64a-b56f4cf2c241.JPG',
    alt: 'Elegant wedding cake with gold decorations',
    storyKey: 'story7',
  },
];

interface HeroCarouselProps {
  locale: string;
}

export default function HeroCarousel({ locale }: HeroCarouselProps) {
  const t = useTranslations('home');
  
  // Create autoplay ref to control it programmatically
  const autoplayRef = useRef(
    Autoplay({ delay: 6000, stopOnInteraction: false })
  );

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, duration: 25 },
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
    autoplayRef.current.reset();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (!emblaApi) return;
    emblaApi.scrollNext();
    autoplayRef.current.reset();
  }, [emblaApi]);

  const scrollTo = useCallback((index: number) => {
    if (!emblaApi) return;
    emblaApi.scrollTo(index);
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
    <div className="relative w-full bg-gradient-to-br from-cream-50 via-cream-100 to-cream-200 overflow-hidden">
      {/* Carousel */}
      <div className="embla" ref={emblaRef}>
        <div className="embla__container flex">
          {heroSlides.map((slide, index) => {
            // Alternate layout: even indices = image left, odd indices = image right
            const isImageLeft = index % 2 === 0;
            
            return (
              <div 
                key={index} 
                className="embla__slide flex-[0_0_100%] min-w-0"
              >
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 lg:py-12">
                  {/* Split-Screen Story Card */}
                  <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center max-w-7xl mx-auto ${
                    !isImageLeft ? 'lg:grid-flow-dense' : ''
                  }`}>
                    {/* Image Side */}
                    <div
                      className={`relative w-full ${!isImageLeft ? 'lg:col-start-2' : ''}`}
                      style={{ 
                        willChange: 'transform',
                      }}
                    >
                      {/* Consistent Frame Size */}
                      <div className={`relative w-full aspect-[3/4] max-w-md mx-auto ${
                        isImageLeft ? 'lg:ml-auto lg:mr-0' : 'lg:mr-auto lg:ml-0'
                      }`}>
                        {/* Image Container with Rounded Corners */}
                        <div className="absolute inset-0 rounded-3xl overflow-hidden shadow-xl md:shadow-2xl bg-white p-3">
                          <div className="relative w-full h-full rounded-2xl overflow-hidden">
                            <Image
                              src={slide.image}
                              alt={slide.alt}
                              fill
                              className="object-cover"
                              priority={index === 0}
                              quality={90}
                              sizes="(max-width: 768px) 100vw, 50vw"
                            />
                          </div>
                        </div>
                        {/* Subtle Shadow Effect - hidden on mobile for performance */}
                        <div className="hidden md:block absolute -inset-4 bg-gradient-to-br from-chocolate-200/20 to-cream-300/20 rounded-3xl blur-2xl -z-10" />
                      </div>
                    </div>

                    {/* Content Side */}
                    <div
                      className={`flex flex-col justify-center space-y-6 text-center lg:text-left ${
                        !isImageLeft ? 'lg:col-start-1 lg:row-start-1' : ''
                      }`}
                    >
                      {/* Story Title */}
                      <div className="space-y-4">
                        <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-chocolate-900 leading-tight">
                          {t(`heroStories.${slide.storyKey}.title`)}
                        </h2>

                        {/* Story Description */}
                        <p className="text-lg sm:text-xl text-chocolate-700 leading-relaxed max-w-xl mx-auto lg:mx-0">
                          {t(`heroStories.${slide.storyKey}.description`)}
                        </p>
                      </div>

                      {/* CTA Button */}
                      <div className="flex justify-center lg:justify-start">
                        <Link href={`/${locale}/products`}>
                          <Button size="lg" className="shadow-lg hover:shadow-xl transition-shadow">
                            {t('viewAll')} →
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation Arrows */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={scrollPrev}
        disabled={!canScrollPrev}
        className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/95 md:bg-white/90 md:backdrop-blur-sm border border-chocolate-200 flex items-center justify-center text-chocolate-700 transition-all duration-200 hover:bg-white hover:shadow-lg disabled:opacity-0 disabled:pointer-events-none"
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
        className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/95 md:bg-white/90 md:backdrop-blur-sm border border-chocolate-200 flex items-center justify-center text-chocolate-700 transition-all duration-200 hover:bg-white hover:shadow-lg disabled:opacity-0 disabled:pointer-events-none"
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

      {/* Elegant Progress Indicators */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-3 z-10">
        {heroSlides.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollTo(index)}
            className="group relative"
            aria-label={`Go to slide ${index + 1}`}
          >
            {/* Outer container */}
            <div className="relative">
              {/* Base line */}
              <div className={`h-0.5 transition-all duration-500 ease-out ${
                index === selectedIndex
                  ? 'w-12 bg-gray-900'
                  : 'w-8 bg-gray-900/30 group-hover:bg-gray-900/50 group-hover:w-10'
              }`} />
              
              {/* Active indicator - subtle accent */}
              {index === selectedIndex && (
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="absolute top-0 left-0 h-0.5 w-full bg-gradient-to-r from-gray-800 via-gray-900 to-gray-800 origin-left"
                />
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
