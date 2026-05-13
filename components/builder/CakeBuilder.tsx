'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import TierSidebar from './TierSidebar';

const CakeScene = dynamic(() => import('./CakeScene'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-brown-200 border-t-brown-500 animate-spin" />
        <p className="text-sm text-charcoal-500 font-medium">Caricamento scena 3D…</p>
      </div>
    </div>
  ),
});

function MobileGate() {
  return (
    <div className="min-h-screen bg-cream-50 flex flex-col items-center justify-center px-8 text-center">
      <div className="text-8xl mb-6 animate-bounce" style={{ animationDuration: '2s' }}>
        🎂
      </div>
      <h1 className="font-heading text-3xl font-bold text-charcoal-900 mb-3">
        Il costruttore 3D è pensato per il desktop
      </h1>
      <p className="text-charcoal-700 max-w-sm leading-relaxed mb-8">
        Per vivere l&apos;esperienza completa — ruotare la torta, trascinare le decorazioni
        e personalizzare ogni livello — apri questa pagina dal tuo computer.
      </p>
      <div className="bg-white border border-cream-300 rounded-2xl px-5 py-4 shadow-sm mb-8 max-w-xs w-full">
        <p className="text-xs text-charcoal-500 mb-1.5">Apri sul tuo PC</p>
        <p className="font-mono text-sm font-bold text-brown-600 break-all">
          {typeof window !== 'undefined' ? window.location.href : 'bakemycake.com/costruttore'}
        </p>
      </div>
      <p className="text-sm text-charcoal-500">
        Oppure{' '}
        <a href="/it/contact" className="text-brown-500 underline hover:text-brown-600 font-medium">
          contattaci direttamente
        </a>{' '}
        per ordinare la tua torta.
      </p>
    </div>
  );
}

import type { BuilderFlavour } from '@/app/[locale]/builder/page';

function DesktopBuilder({ uploadToken, flavours }: { uploadToken: string; flavours?: BuilderFlavour[] }) {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-gradient-to-br from-cream-50 via-cream-100 to-rose-50">
      {/* Full-screen 3D scene */}
      <div className="absolute inset-0">
        <CakeScene />
      </div>

      {/* Right sidebar — tier cards, decorations, order summary */}
      <TierSidebar uploadToken={uploadToken} flavours={flavours} />
    </div>
  );
}

export default function CakeBuilder({ uploadToken, flavours }: { uploadToken: string; flavours?: BuilderFlavour[] }) {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (isMobile === null) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-brown-200 border-t-brown-500 animate-spin" />
      </div>
    );
  }

  return isMobile ? <MobileGate /> : <DesktopBuilder uploadToken={uploadToken} flavours={flavours} />;
}
