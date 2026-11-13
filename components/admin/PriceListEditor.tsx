'use client';

import { useState } from 'react';
import type { Client } from '@/lib/db/schema';
import type { PriceListItem } from '@/lib/clients/price-list';
import { Plus, Trash2, Zap } from 'lucide-react';

// Business client's agreed positions (name + price).
// These appear as quick-pick buttons in the "Быстрая продажа" modal.

interface Row {
  name: string;
  price: string; // kept as text while typing
}

const toRows = (items: PriceListItem[]): Row[] =>
  items.map((i) => ({ name: i.name, price: String(i.price) }));

export default function PriceListEditor({
  client,
  onUpdate,
}: {
  client: Client;
  onUpdate: (updatedClient: Client) => void;
}) {
  const items = client.priceList ?? [];
  const [isEditing, setIsEditing] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const startEditing = () => {
    setRows(items.length ? toRows(items) : [{ name: '', price: '' }]);
    setError('');
    setIsEditing(true);
  };

  const updateRow = (index: number, patch: Partial<Row>) =>
    setRows(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          price_list: rows.map((r) => ({ name: r.name, price: r.price.replace(',', '.') })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Не удалось сохранить');
      onUpdate(data.client);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white border-2 border-cream-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-lg font-heading font-bold text-charcoal-900">Прайс</h3>
        {!isEditing && (
          <button
            onClick={startEditing}
            className="px-4 py-2 bg-brown-500 text-white rounded-lg hover:bg-brown-600 transition-colors text-sm font-semibold"
          >
            {items.length ? 'Изменить' : 'Добавить'}
          </button>
        )}
      </div>
      <p className="text-xs text-charcoal-500 mb-4 flex items-center gap-1">
        <Zap className="w-3 h-3" />
        Позиции появляются в «Быстрой продаже»
      </p>

      {isEditing ? (
        <div className="space-y-3">
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {rows.map((row, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={row.name}
                onChange={(e) => updateRow(index, { name: e.target.value })}
                placeholder="Название"
                autoFocus={index === rows.length - 1 && !row.name}
                className="flex-1 min-w-0 px-3 py-2 border-2 border-cream-300 rounded-lg focus:ring-2 focus:ring-brown-500 focus:border-transparent"
              />
              <div className="relative w-28 shrink-0">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-charcoal-500">
                  CHF
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={row.price}
                  onChange={(e) => updateRow(index, { price: e.target.value })}
                  placeholder="0.00"
                  className="w-full pl-11 pr-2 py-2 border-2 border-cream-300 rounded-lg text-right focus:ring-2 focus:ring-brown-500 focus:border-transparent"
                />
              </div>
              <button
                type="button"
                onClick={() => setRows(rows.filter((_, i) => i !== index))}
                className="p-2 text-red-600 hover:text-red-800 shrink-0"
                aria-label="Удалить позицию"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setRows([...rows, { name: '', price: '' }])}
            className="flex items-center gap-1 text-sm font-semibold text-brown-600 hover:text-brown-700"
          >
            <Plus className="w-4 h-4" />
            Позиция
          </button>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 px-4 py-2 bg-brown-500 text-white rounded-lg hover:bg-brown-600 transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Сохранение...' : 'Сохранить'}
            </button>
            <button
              onClick={() => setIsEditing(false)}
              disabled={isSaving}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Отмена
            </button>
          </div>
        </div>
      ) : items.length ? (
        <ul className="divide-y divide-cream-200">
          {items.map((item) => (
            <li key={item.name} className="flex justify-between py-2 text-charcoal-700">
              <span>{item.name}</span>
              <span className="font-semibold text-brown-600">CHF {item.price.toFixed(2)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-charcoal-500">Позиций пока нет.</p>
      )}
    </div>
  );
}
