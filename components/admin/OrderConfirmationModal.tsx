'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Copy, Check, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { formatDeliveryAddress } from '@/lib/schemas/delivery';
import { parseDateFromDB } from '@/lib/utils';
import type { Database } from '@/lib/supabase/types';

type Order = Database['public']['Tables']['orders']['Row'];
type OrderItem = Database['public']['Tables']['order_items']['Row'];
type Client = Database['public']['Tables']['clients']['Row'];

interface OrderWithItems extends Order {
  order_items: OrderItem[];
  client: Client | null;
}

interface OrderConfirmationModalProps {
  order: OrderWithItems;
  onClose: () => void;
}

type Language = 'ru' | 'en' | 'it';

interface ItemDraft {
  id: string;
  product_name: string;
  quantity: number;
  subtotal: number;
  flavour_name: string | null;
  weight_kg: string | null;
  diameter_cm: string | null;
  writing_on_cake: string;
}

const LABELS = {
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
    total: 'Итого',
    footer: 'С уважением, Bake My Cake 🎂',
    editWriting: 'Надпись на торте',
    editWritingHint: 'Отредактируйте перед отправкой',
    copyBtn: 'Скопировать',
    copied: 'Скопировано!',
    noDate: 'уточняется',
    noItems: 'без состава',
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
    total: 'Total',
    footer: 'With love, Bake My Cake 🎂',
    editWriting: 'Writing on cake',
    editWritingHint: 'Edit before sending',
    copyBtn: 'Copy',
    copied: 'Copied!',
    noDate: 'to be confirmed',
    noItems: 'no items',
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
    total: 'Totale',
    footer: 'Con affetto, Bake My Cake 🎂',
    editWriting: 'Scritta sulla torta',
    editWritingHint: 'Modifica prima di inviare',
    copyBtn: 'Copia',
    copied: 'Copiato!',
    noDate: 'da confermare',
    noItems: 'nessun articolo',
  },
};

function formatCurrency(amount: number, currency = 'CHF') {
  return new Intl.NumberFormat('de-CH', { style: 'currency', currency }).format(amount);
}

function buildConfirmationText(
  order: OrderWithItems,
  items: ItemDraft[],
  lang: Language
): string {
  const L = LABELS[lang];
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
      if (item.weight_kg) lines.push(`  ${L.weight}: ${item.weight_kg} kg`);
      if (item.writing_on_cake.trim()) lines.push(`  ${L.writing}: "${item.writing_on_cake.trim()}"`);
    });
  }

  lines.push('');
  lines.push(`💰 ${L.total}: ${formatCurrency(order.total_amount, order.currency)}`);
  lines.push('');
  lines.push(L.footer);

  return lines.join('\n');
}

export default function OrderConfirmationModal({ order, onClose }: OrderConfirmationModalProps) {
  const [lang, setLang] = useState<Language>('ru');
  const [copied, setCopied] = useState(false);
  const [items, setItems] = useState<ItemDraft[]>([]);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setItems(
      order.order_items.map((item) => ({
        id: item.id,
        product_name: item.product_name,
        quantity: item.quantity,
        subtotal: item.subtotal,
        flavour_name: item.flavour_name,
        weight_kg: item.weight_kg,
        diameter_cm: item.diameter_cm,
        writing_on_cake: item.writing_on_cake || '',
      }))
    );
  }, [order.order_items]);

  const confirmationText = buildConfirmationText(order, items, lang);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(confirmationText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers that block clipboard API
      if (textAreaRef.current) {
        textAreaRef.current.select();
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const updateItemWriting = (id: string, value: string) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, writing_on_cake: value } : item)));
  };

  const writingItems = items.filter((item) => item.writing_on_cake !== undefined);
  const L = LABELS[lang];

  const langFlags: { code: Language; flag: string; label: string }[] = [
    { code: 'ru', flag: '🇷🇺', label: 'РУС' },
    { code: 'en', flag: '🇬🇧', label: 'ENG' },
    { code: 'it', flag: '🇮🇹', label: 'ITA' },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-cream-200">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-pink-500" />
            <h2 className="font-heading font-bold text-charcoal-900 text-base">{L.title}</h2>
            {order.order_number && (
              <span className="text-xs text-charcoal-500 font-mono">#{order.order_number}</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-cream-100 transition-colors text-charcoal-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Language Selector */}
          <div className="flex gap-2">
            {langFlags.map(({ code, flag, label }) => (
              <button
                key={code}
                onClick={() => setLang(code)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                  lang === code
                    ? 'bg-pink-500 text-white shadow-sm'
                    : 'bg-cream-100 text-charcoal-700 hover:bg-cream-200'
                }`}
              >
                {flag} {label}
              </button>
            ))}
          </div>

          {/* Editable Writing-on-Cake fields */}
          {writingItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-charcoal-500 uppercase tracking-wide">
                {L.editWriting} — {L.editWritingHint}
              </p>
              {writingItems.map((item) => (
                <div key={item.id} className="space-y-1">
                  {writingItems.length > 1 && (
                    <p className="text-xs text-charcoal-500 truncate">{item.product_name}</p>
                  )}
                  <input
                    type="text"
                    value={item.writing_on_cake}
                    onChange={(e) => updateItemWriting(item.id, e.target.value)}
                    placeholder="—"
                    className="w-full px-3 py-2 rounded-lg border border-cream-300 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 bg-pink-50"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Generated Text Preview */}
          <div className="space-y-2">
            <textarea
              ref={textAreaRef}
              readOnly
              value={confirmationText}
              rows={18}
              className="w-full px-3 py-3 rounded-xl border border-cream-300 text-sm font-mono bg-cream-50 resize-none focus:outline-none focus:ring-2 focus:ring-pink-300 leading-relaxed"
            />
          </div>
        </div>

        {/* Footer with Copy Button */}
        <div className="px-5 py-4 border-t border-cream-200">
          <button
            onClick={handleCopy}
            className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
              copied
                ? 'bg-green-500 text-white'
                : 'bg-pink-500 hover:bg-pink-600 text-white shadow-sm hover:shadow-md'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                {L.copied}
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                {L.copyBtn}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
