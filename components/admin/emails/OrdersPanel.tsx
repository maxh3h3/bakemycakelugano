'use client';

import { useState } from 'react';
import { Cake, ChevronDown, Send, Store, Truck } from 'lucide-react';
import type { EmailOrder } from '@/lib/email/types';
import type { ConfirmationLanguage } from '@/lib/orders/confirmation-text';
import { OrderBadge, chf, orderDate } from './OrderMeta';

const LANGS: { code: ConfirmationLanguage; label: string }[] = [
  { code: 'it', label: 'IT' },
  { code: 'en', label: 'EN' },
  { code: 'ru', label: 'RU' },
];

interface OrdersPanelProps {
  orders: EmailOrder[];
  /** Puts the order confirmation into the reply box as a draft to review. */
  onConfirmation: (order: EmailOrder, lang: ConfirmationLanguage) => void;
}

/** The client's orders above the conversation: open and unpaid ones shown, closed ones folded. */
export default function OrdersPanel({ orders, onConfirmation }: OrdersPanelProps) {
  const [showClosed, setShowClosed] = useState(false);
  const [pickingFor, setPickingFor] = useState<string | null>(null);

  const active = orders.filter(o => o.state !== 'closed');
  const closed = orders.filter(o => o.state === 'closed');
  if (orders.length === 0) return null;

  const row = (o: EmailOrder) => (
    <li key={o.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2 text-xs sm:px-5">
      <Cake size={14} className={o.state === 'closed' ? 'text-charcoal-500' : 'text-brown-500'} />
      <span className="font-mono font-medium text-charcoal-900">#{o.order_number ?? '—'}</span>
      <span className="flex items-center gap-1 text-charcoal-700">
        {o.delivery_type === 'delivery' ? <Truck size={12} /> : <Store size={12} />}
        {orderDate(o, true)}
      </span>
      <span className="text-charcoal-700">{chf(o.total_amount, o.currency)}</span>
      <OrderBadge order={o} />
      {o.state === 'open' && (
        <span className="ml-auto flex items-center gap-1">
          {pickingFor === o.id ? (
            <>
              <span className="text-charcoal-500">Язык:</span>
              {LANGS.map(l => (
                <button
                  key={l.code}
                  onClick={() => { onConfirmation(o, l.code); setPickingFor(null); }}
                  className="rounded-md bg-brown-500 px-2 py-1 font-medium text-white hover:bg-brown-600"
                >
                  {l.label}
                </button>
              ))}
              <button onClick={() => setPickingFor(null)} className="px-1 text-charcoal-500 hover:text-charcoal-900">✕</button>
            </>
          ) : (
            <button
              onClick={() => setPickingFor(o.id)}
              className="flex items-center gap-1 rounded-md border border-cream-300 bg-white px-2 py-1 font-medium text-brown-700 hover:bg-cream-100"
              title="Вставить подтверждение заказа в ответ"
            >
              <Send size={11} /> Подтверждение
            </button>
          )}
        </span>
      )}
    </li>
  );

  return (
    <div className="border-b border-cream-200 bg-cream-50">
      {active.length > 0 && <ul className="divide-y divide-cream-200">{active.map(row)}</ul>}
      {closed.length > 0 && (
        <>
          <button
            onClick={() => setShowClosed(v => !v)}
            className={`flex w-full items-center gap-1.5 px-4 py-1.5 text-xs text-charcoal-500 hover:text-charcoal-900 sm:px-5 ${active.length ? 'border-t border-cream-200' : ''}`}
            aria-expanded={showClosed}
          >
            <ChevronDown size={13} className={`transition-transform ${showClosed ? 'rotate-180' : ''}`} />
            Завершённые заказы: {closed.length}
          </button>
          {showClosed && <ul className="divide-y divide-cream-200 border-t border-cream-200">{closed.map(row)}</ul>}
        </>
      )}
    </div>
  );
}
