'use client';

import { useState } from 'react';
import CreateOrderModal from './CreateOrderModal';

export default function CreateOrderButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="px-6 py-3 bg-brown-500 text-white rounded-xl font-semibold hover:bg-brown-600 transition-colors shadow-lg hover:shadow-xl flex items-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Create Order
      </button>

      {isModalOpen && (
        <CreateOrderModal onClose={() => setIsModalOpen(false)} />
      )}
    </>
  );
}

