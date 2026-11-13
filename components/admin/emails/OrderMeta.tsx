import type { EmailOrder } from '@/lib/email/types';

// How an order's state reads in the email UI. Rules live in lib/email/contacts.ts:
// open until the date passes; then closed when paid, otherwise done but unpaid.

export function orderDate(order: Pick<EmailOrder, 'delivery_date' | 'delivery_time'>, withTime = false): string {
  if (!order.delivery_date) return 'дата не указана';
  const [y, m, d] = order.delivery_date.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const sameYear = y === new Date().getFullYear();
  const label = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', ...(!sameYear && { year: 'numeric' }) });
  return withTime && order.delivery_time ? `${label}, ${order.delivery_time}` : label;
}

export const chf = (n: number, currency = 'CHF') =>
  new Intl.NumberFormat('de-CH', { style: 'currency', currency }).format(n);

/** Badge text and colours for an order. */
export function orderBadge(order: Pick<EmailOrder, 'state' | 'paid'>): { label: string; className: string } {
  switch (order.state) {
    case 'closed':
      return { label: 'завершён', className: 'bg-cream-200 text-charcoal-700' };
    case 'unpaid':
      return { label: 'выполнен · не оплачен', className: 'bg-amber-100 text-amber-900 ring-1 ring-amber-300' };
    default:
      return order.paid
        ? { label: 'оплачен', className: 'bg-emerald-100 text-emerald-800' }
        : { label: 'не оплачен', className: 'bg-amber-100 text-amber-800' };
  }
}

export function OrderBadge({ order, className = '' }: { order: Pick<EmailOrder, 'state' | 'paid'>; className?: string }) {
  const b = orderBadge(order);
  return <span className={`whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-medium ${b.className} ${className}`}>{b.label}</span>;
}
