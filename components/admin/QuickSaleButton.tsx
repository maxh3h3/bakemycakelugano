'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import QuickSaleModal from './QuickSaleModal';
import { Zap } from 'lucide-react';

export default function QuickSaleButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  const handleSuccess = () => {
    setIsModalOpen(false);
    router.refresh(); // Refresh server component data
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="px-6 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors shadow-lg hover:shadow-xl flex items-center gap-2"
      >
        <Zap className="w-5 h-5" />
        <span> Быстрая продажа </span>
      </button>

      {isModalOpen && (
        <QuickSaleModal
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}
