'use client';

import { useState } from 'react';
import CreateOrderModal from './CreateOrderModal';
import t from '@/lib/admin-translations-extended';
import { Plus } from 'lucide-react';

export default function CreateOrderButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="px-6 py-3 bg-brown-500 text-white rounded-xl font-semibold hover:bg-brown-600 transition-colors shadow-lg hover:shadow-xl flex items-center gap-2"
      >
        <Plus className="w-5 h-5" />
        {t.createOrder}
      </button>

      {isModalOpen && (
        <CreateOrderModal onClose={() => setIsModalOpen(false)} />
      )}
    </>
  );
}

