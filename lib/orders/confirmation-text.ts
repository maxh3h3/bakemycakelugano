import { format } from 'date-fns';
import { formatDeliveryAddress } from '@/lib/schemas/delivery';
import { parseDateFromDB } from '@/lib/utils';

// The customer-facing order confirmation text, shared by the order card's
// confirmation modal and the email composer so both send the same wording.

export type ConfirmationLanguage = 'ru' | 'en' | 'it';

/** The order fields the text uses (a subset of the orders row). */
export interface ConfirmationOrder {
  order_number: string | null;
  delivery_date: string | null;
  delivery_time: string | null;
  delivery_type: string | null;
  delivery_address: any;
  customer_notes: string | null;
  total_amount: number;
  currency: string;
}

export interface ConfirmationItem {
  id: string;
  product_name: string;
  quantity: number;
  subtotal: number;
  flavour_name: string | null;
  weight_kg: string | null;
  diameter_cm: string | null;
  writing_on_cake: string;
}

export const CONFIRMATION_LABELS = {
  ru: {
    title: 'Подтверждение заказа',
    order: 'Заказ',
    confirmed: 'подтверждён!',
    date: 'Дата',
    time: 'Время',
    delivery: 'Доставка',
    pickup: 'Самовывоз',
    items: 'Состав заказа',
    qty: 'шт.',
    flavour: 'Вкус',
    writing: 'Надпись',
    weight: 'Вес',
    diameter: 'Диаметр',
    notes: 'Примечания',
    total: 'Итого',
    footer: 'С уважением, Bake My Cake 🎂',
    editWriting: 'Надпись на торте',
    editWritingHint: 'Отредактируйте перед отправкой',
    copyBtn: 'Скопировать',
    copied: 'Скопировано!',
    noDate: 'уточняется',
    noItems: 'без состава',
    subject: 'Подтверждение заказа',
  },
  en: {
    title: 'Order Confirmation',
    order: 'Order',
    confirmed: 'confirmed!',
    date: 'Date',
    time: 'Time',
    delivery: 'Delivery',
    pickup: 'Pickup',
    items: 'Order details',
    qty: 'pcs',
    flavour: 'Flavour',
    writing: 'Writing',
    weight: 'Weight',
    diameter: 'Diameter',
    notes: 'Notes',
    total: 'Total',
    footer: 'With love, Bake My Cake 🎂',
    editWriting: 'Writing on cake',
    editWritingHint: 'Edit before sending',
    copyBtn: 'Copy',
    copied: 'Copied!',
    noDate: 'to be confirmed',
    noItems: 'no items',
    subject: 'Order confirmation',
  },
  it: {
    title: 'Conferma ordine',
    order: 'Ordine',
    confirmed: 'confermato!',
    date: 'Data',
    time: 'Orario',
    delivery: 'Consegna',
    pickup: 'Ritiro',
    items: 'Dettagli ordine',
    qty: 'pz.',
    flavour: 'Gusto',
    writing: 'Scritta',
    weight: 'Peso',
    diameter: 'Diametro',
    notes: 'Note',
    total: 'Totale',
    footer: 'Con affetto, Bake My Cake 🎂',
    editWriting: 'Scritta sulla torta',
    editWritingHint: 'Modifica prima di inviare',
    copyBtn: 'Copia',
    copied: 'Copiato!',
    noDate: 'da confermare',
    noItems: 'nessun articolo',
    subject: 'Conferma ordine',
  },
};

function formatCurrency(amount: number, currency = 'CHF') {
  return new Intl.NumberFormat('de-CH', { style: 'currency', currency }).format(amount);
}

export function buildConfirmationText(
  order: ConfirmationOrder,
  items: ConfirmationItem[],
  lang: ConfirmationLanguage,
): string {
  const L = CONFIRMATION_LABELS[lang];
  const lines: string[] = [];

  const orderNum = order.order_number ? `#${order.order_number}` : '';
  lines.push(`✅ ${L.order} ${orderNum} ${L.confirmed}`);
  lines.push('');

  if (order.delivery_date) {
    const d = parseDateFromDB(order.delivery_date);
    const formatted =
      lang === 'ru'
        ? format(d, 'dd.MM.yyyy')
        : lang === 'it'
        ? format(d, 'dd/MM/yyyy')
        : format(d, 'MM/dd/yyyy');
    const timePart = order.delivery_time ? ` — ${order.delivery_time}` : '';
    lines.push(`🗓 ${L.date}: ${formatted}${timePart}`);
  } else {
    lines.push(`🗓 ${L.date}: ${L.noDate}`);
  }

  if (order.delivery_type === 'delivery' && order.delivery_address) {
    lines.push(`📍 ${L.delivery}: ${formatDeliveryAddress(order.delivery_address)}`);
  } else {
    lines.push(`📍 ${L.pickup}: Via Selva 4, Massagno`);
  }

  lines.push('');
  lines.push(`📦 ${L.items}:`);

  if (items.length === 0) {
    lines.push(`  — ${L.noItems}`);
  } else {
    items.forEach((item) => {
      const price = formatCurrency(item.subtotal, order.currency);
      lines.push(`• ${item.product_name} × ${item.quantity} ${L.qty} — ${price}`);
      if (item.flavour_name) lines.push(`  ${L.flavour}: ${item.flavour_name}`);
      // Website orders already carry the unit ("1.5 kg", "12 pcs"); manual orders may be a bare number
      if (item.weight_kg) {
        const weight = /^\d+([.,]\d+)?$/.test(item.weight_kg.trim()) ? `${item.weight_kg.trim()} kg` : item.weight_kg;
        lines.push(`  ${L.weight}: ${weight}`);
      }
      if (item.writing_on_cake.trim()) lines.push(`  ${L.writing}: "${item.writing_on_cake.trim()}"`);
    });
  }

  const notes = order.customer_notes?.trim();
  if (notes) {
    lines.push('');
    lines.push(`📝 ${L.notes}: ${notes}`);
  }

  lines.push('');
  lines.push(`💰 ${L.total}: ${formatCurrency(order.total_amount, order.currency)}`);
  lines.push('');
  lines.push(L.footer);

  return lines.join('\n');
}
