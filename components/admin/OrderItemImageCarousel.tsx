'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface OrderItemImageCarouselProps {
  urls: string[];
  containerClassName?: string;
  imageClassName?: string;
}

export default function OrderItemImageCarousel({
  urls,
  containerClassName = 'w-64 h-64',
  imageClassName = 'object-cover',
}: OrderItemImageCarouselProps) {
  const [index, setIndex] = useState(0);

  if (!urls || urls.length === 0) {
    return null;
  }

  const showControls = urls.length > 1;
  const currentUrl = urls[index] || urls[0];

  const goPrev = () => {
    setIndex((prev) => (prev - 1 + urls.length) % urls.length);
  };

  const goNext = () => {
    setIndex((prev) => (prev + 1) % urls.length);
  };

  return (
    <div className={`relative ${containerClassName}`}>
      <Image
        src={currentUrl}
        alt="Order item image"
        fill
        className={imageClassName}
      />

      {showControls && (
        <>
          <button
            type="button"
            onClick={goPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-charcoal-700 rounded-full p-1.5 shadow-md"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={goNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-charcoal-700 rounded-full p-1.5 shadow-md"
            aria-label="Next image"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {urls.map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 w-1.5 rounded-full ${
                  idx === index ? 'bg-brown-500' : 'bg-white/70'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
