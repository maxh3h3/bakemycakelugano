'use client';

import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface PaymentToggleProps {
  paid: boolean;
  loading: boolean;
  onToggle: () => void;
}

export default function PaymentToggle({ paid, loading, onToggle }: PaymentToggleProps) {
  return (
    <button
      onClick={onToggle}
      disabled={loading}
      className={`
        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold
        border-2 transition-all duration-200 whitespace-nowrap
        ${loading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:scale-105 active:scale-95'}
        ${paid
          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
          : 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
        }
      `}
      title={paid ? 'Нажмите, чтобы отметить неоплаченным' : 'Нажмите, чтобы отметить оплаченным'}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : paid ? (
        <CheckCircle2 className="w-3.5 h-3.5" />
      ) : (
        <XCircle className="w-3.5 h-3.5" />
      )}
      {paid ? 'Оплачен' : 'Не оплачен'}
    </button>
  );
}
