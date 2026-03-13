'use client';

import { formatDeliveryAddress, type DeliveryAddress } from '@/lib/schemas/delivery';
import { extractTimeForSorting } from '@/lib/utils';
import PaymentToggle from '@/components/admin/PaymentToggle';
import type { OrderWithItems } from '@/app/admin/delivery/page';

interface DeliveryOrderCardProps {
  order: OrderWithItems;
  isLoading: boolean;
  onTogglePaid: () => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF' }).format(amount);
}

function getTimeColor(deliveryTime: string | null): { className: string; label: string } | null {
  if (!deliveryTime) return null;
  const parsed = extractTimeForSorting(deliveryTime);
  if (parsed === null) return null;

  const now = new Date();
  const nowDecimal = now.getHours() + now.getMinutes() / 60;
  const diffHours = parsed - nowDecimal;

  if (diffHours <= 1) return { className: 'text-red-600', label: deliveryTime };
  if (diffHours <= 2) return { className: 'text-orange-500', label: deliveryTime };
  return { className: 'text-charcoal-900', label: deliveryTime };
}

export default function DeliveryOrderCard({ order, isLoading, onTogglePaid }: DeliveryOrderCardProps) {
  const timeInfo = getTimeColor(order.delivery_time);
  const address = formatDeliveryAddress(order.delivery_address as DeliveryAddress | null);

  const itemsSummary = order.order_items
    .map((i) => `${i.product_name}${i.quantity > 1 ? ` ×${i.quantity}` : ''}`)
    .join(', ');

  const client = order.client;
  const phone = client?.phone ?? null;
  const whatsapp = client?.whatsapp ?? null;
  const email = client?.email ?? null;

  return (
    <div
      className={`bg-white rounded-2xl border-2 shadow-sm transition-all duration-200 ${
        order.paid ? 'border-emerald-200' : 'border-amber-200'
      }`}
    >
      {/* Colored top bar */}
      <div className={`h-1.5 rounded-t-2xl ${order.paid ? 'bg-emerald-400' : 'bg-amber-400'}`} />

      <div className="p-4 space-y-3">
        {/* 1. Time row — dominant element */}
        <div>
          {timeInfo ? (
            <p className={`text-2xl font-bold ${timeInfo.className}`}>{timeInfo.label}</p>
          ) : (
            <p className="text-base text-charcoal-400 italic">Время не указано</p>
          )}
        </div>

        {/* 2. Client name */}
        <p className="text-lg font-bold text-charcoal-900">{client?.name ?? '—'}</p>

        {/* 3. Contact row */}
        <div className="flex flex-wrap gap-3">
          {phone ? (
            <>
              <a
                href={`tel:${phone}`}
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
              >
                📞 {phone}
              </a>
              <a
                href={`https://wa.me/${phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-green-600 hover:underline"
              >
                💬 WhatsApp
              </a>
            </>
          ) : whatsapp ? (
            <a
              href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-green-600 hover:underline"
            >
              💬 {whatsapp}
            </a>
          ) : email ? (
            <a
              href={`mailto:${email}`}
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
            >
              ✉️ {email}
            </a>
          ) : (
            <span className="text-sm text-charcoal-400 italic">Нет контакта</span>
          )}
        </div>

        {/* 4. Address */}
        {address ? (
          <p className="text-sm text-charcoal-600 bg-cream-50 rounded-lg px-3 py-2">{address}</p>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-amber-300 bg-amber-50 text-amber-700 text-sm font-medium">
            ⚠️ Адрес не указан
          </div>
        )}

        {/* 5. Items */}
        {itemsSummary && (
          <p className="text-xs text-charcoal-500 truncate">{itemsSummary}</p>
        )}

        {/* 6. Footer: total + payment toggle */}
        <div className="flex items-center justify-between pt-1 border-t border-cream-200">
          <p className="font-bold text-charcoal-900">{formatCurrency(Number(order.total_amount))}</p>
          <PaymentToggle
            paid={order.paid ?? false}
            loading={isLoading}
            onToggle={onTogglePaid}
          />
        </div>
      </div>
    </div>
  );
}
