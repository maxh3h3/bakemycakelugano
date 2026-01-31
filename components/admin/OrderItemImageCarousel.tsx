'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react';

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
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!urls || urls.length === 0) {
    return null;
  }

  const showControls = urls.length > 1;
  const currentUrl = urls[index] || urls[0];

  const goPrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIndex((prev) => (prev - 1 + urls.length) % urls.length);
  };

  const goNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIndex((prev) => (prev + 1) % urls.length);
  };

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      {/* Thumbnail Carousel */}
      <div 
        className={`relative group ${containerClassName}`}
        onClick={openModal}
      >
        <Image
          src={currentUrl}
          alt="Order item image"
          fill
          className={imageClassName}
        />

        {/* Zoom indicator overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
          <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {showControls && (
          <>
            <button
              type="button"
              onClick={goPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-charcoal-700 rounded-full p-1.5 shadow-md z-10"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={goNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-charcoal-700 rounded-full p-1.5 shadow-md z-10"
              aria-label="Next image"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
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

      {/* Full-Screen Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-[10000] bg-black/90 flex items-center justify-center p-4"
          onClick={closeModal}
        >
          {/* Close button */}
          <button
            onClick={closeModal}
            className="absolute top-4 right-4 bg-white/90 hover:bg-white text-charcoal-900 rounded-full p-3 shadow-lg z-10 transition-all"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Image counter */}
          {showControls && (
            <div className="absolute top-4 left-4 bg-white/90 text-charcoal-900 px-4 py-2 rounded-full font-semibold shadow-lg">
              {index + 1} / {urls.length}
            </div>
          )}

          {/* Large image */}
          <div 
            className="relative w-full h-full max-w-5xl max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={currentUrl}
              alt="Order item image (full size)"
              fill
              className="object-contain"
            />
          </div>

          {/* Navigation controls for modal */}
          {showControls && (
            <>
              <button
                type="button"
                onClick={goPrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-charcoal-900 rounded-full p-4 shadow-lg transition-all z-10"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button
                type="button"
                onClick={goNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-charcoal-900 rounded-full p-4 shadow-lg transition-all z-10"
                aria-label="Next image"
              >
                <ChevronRight className="w-8 h-8" />
              </button>

              {/* Dot indicators */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2.5">
                {urls.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIndex(idx);
                    }}
                    className={`h-3 w-3 rounded-full transition-all ${
                      idx === index ? 'bg-brown-500 scale-125' : 'bg-white/70 hover:bg-white/90'
                    }`}
                    aria-label={`Go to image ${idx + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
