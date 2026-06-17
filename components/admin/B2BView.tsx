'use client';

/// <reference types="@types/google.maps" />

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useJsApiLoader, GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';
import { Loader2, Trash2, Plus, MapPin } from 'lucide-react';

// ⚠️ TEMPORARY B2B prospects CRM — see migration 045.

interface Prospect {
  id: string;
  name: string;
  address: string | null;
  reviews_count: number | null;
  status: string;
  category: string | null;
  lat: number | null;
  lng: number | null;
  opening_hours: string[] | null;
}

// weekdayDescriptions are ordered Monday..Sunday; JS getDay() is Sun=0..Sat=6.
function todayHours(hours: string[] | null): string | null {
  if (!hours || hours.length === 0) return null;
  const idx = (new Date().getDay() + 6) % 7; // Monday = 0
  const line = hours[idx];
  if (!line) return null;
  // Strip the leading weekday name ("Monday: 10:30 AM – 2:00 PM" -> hours only)
  const colon = line.indexOf(':');
  return colon === -1 ? line : line.slice(colon + 1).trim();
}

type Status = 'new' | 'contacted' | 'negotiating' | 'won' | 'lost';

// Russian labels + colors for the outreach pipeline statuses
const STATUS_LABELS: Record<Status, string> = {
  new: 'Новый',
  contacted: 'Связались',
  negotiating: 'Переговоры',
  won: 'Клиент',
  lost: 'Отказ',
};

const STATUS_ORDER: Status[] = ['new', 'contacted', 'negotiating', 'won', 'lost'];

// Google marker dot colors per status
const STATUS_MARKER: Record<Status, string> = {
  new: 'blue',
  contacted: 'yellow',
  negotiating: 'purple',
  won: 'green',
  lost: 'red',
};

const STATUS_BADGE: Record<Status, string> = {
  new: 'bg-blue-100 text-blue-700 border-blue-300',
  contacted: 'bg-amber-100 text-amber-700 border-amber-300',
  negotiating: 'bg-purple-100 text-purple-700 border-purple-300',
  won: 'bg-green-100 text-green-700 border-green-300',
  lost: 'bg-red-100 text-red-700 border-red-300',
};

const LUGANO_CENTER = { lat: 46.01, lng: 8.96 };

// Category filter options (client-side). 'all' shows everything.
const CATEGORY_FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'japanese', label: 'Японские' },
  { value: 'asian', label: 'Азиатские' },
  { value: 'hotel', label: 'Отели' },
];

export default function B2BView() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', reviews_count: '' });
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
  });

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/b2b');
      const data = await res.json();
      if (data.success) setProspects(data.prospects);
    } catch (e) {
      console.error('Failed to load prospects', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Prospects matching the active category filter — drives both map and table.
  const visible = useMemo(
    () =>
      categoryFilter === 'all'
        ? prospects
        : prospects.filter((p) => p.category === categoryFilter),
    [prospects, categoryFilter]
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of visible) c[p.status] = (c[p.status] ?? 0) + 1;
    return c;
  }, [visible]);

  // Count per category for the filter buttons.
  const categoryCounts = useMemo(() => {
    const c: Record<string, number> = { all: prospects.length };
    for (const p of prospects) {
      if (p.category) c[p.category] = (c[p.category] ?? 0) + 1;
    }
    return c;
  }, [prospects]);

  const mapped = useMemo(
    () => visible.filter((p) => p.lat != null && p.lng != null),
    [visible]
  );

  async function updateStatus(id: string, status: string) {
    setProspects((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
    await fetch(`/api/admin/b2b/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
  }

  async function remove(id: string) {
    if (!confirm('Удалить эту запись?')) return;
    setProspects((prev) => prev.filter((p) => p.id !== id));
    await fetch(`/api/admin/b2b/${id}`, { method: 'DELETE' });
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setAdding(true);
    try {
      const res = await fetch('/api/admin/b2b', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setProspects((prev) => [data.prospect, ...prev]);
        setForm({ name: '', address: '', reviews_count: '' });
      }
    } finally {
      setAdding(false);
    }
  }

  const selectedProspect = mapped.find((p) => p.id === selected);

  return (
    <div className="space-y-8">
      {/* Category filter — drives both the map and the table */}
      <div className="flex flex-wrap gap-2">
        {CATEGORY_FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setCategoryFilter(value)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border-2 transition-colors ${
              categoryFilter === value
                ? 'bg-brown-500 text-white border-brown-500'
                : 'bg-white text-charcoal-700 border-cream-300 hover:border-brown-300'
            }`}
          >
            {label}
            <span
              className={`text-xs ${
                categoryFilter === value ? 'text-white/80' : 'text-charcoal-400'
              }`}
            >
              {categoryCounts[value] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-xl border-2 border-cream-200 bg-white px-4 py-3">
          <div className="text-2xl font-bold text-brown-500">{visible.length}</div>
          <div className="text-xs text-charcoal-500">Всего</div>
        </div>
        {STATUS_ORDER.map((s) => (
          <div key={s} className="rounded-xl border-2 border-cream-200 bg-white px-4 py-3">
            <div className="text-2xl font-bold text-charcoal-700">{counts[s] ?? 0}</div>
            <div className="text-xs text-charcoal-500">{STATUS_LABELS[s]}</div>
          </div>
        ))}
      </div>

      {/* Map */}
      <div className="rounded-2xl border-2 border-cream-200 bg-white overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-cream-200 bg-cream-50">
          <MapPin className="w-4 h-4 text-brown-500" />
          <span className="font-medium text-charcoal-700">
            Карта партнёров ({mapped.length} на карте)
          </span>
        </div>
        <div className="h-[360px] sm:h-[480px]">
          {!isLoaded ? (
            <div className="h-full flex items-center justify-center text-charcoal-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '100%' }}
              zoom={13}
              center={LUGANO_CENTER}
              options={{ streetViewControl: false, mapTypeControl: false }}
            >
              {mapped.map((p) => (
                <Marker
                  key={p.id}
                  position={{ lat: p.lat as number, lng: p.lng as number }}
                  icon={`https://maps.google.com/mapfiles/ms/icons/${
                    STATUS_MARKER[(p.status as Status)] ?? 'blue'
                  }-dot.png`}
                  onClick={() => setSelected(p.id)}
                />
              ))}
              {selectedProspect && (
                <InfoWindow
                  position={{
                    lat: selectedProspect.lat as number,
                    lng: selectedProspect.lng as number,
                  }}
                  onCloseClick={() => setSelected(null)}
                >
                  <div className="text-sm">
                    <div className="font-semibold text-gray-900">{selectedProspect.name}</div>
                    {selectedProspect.address && (
                      <div className="text-gray-600">{selectedProspect.address}</div>
                    )}
                    <div className="text-gray-600">
                      Отзывов: {selectedProspect.reviews_count ?? '—'}
                    </div>
                    <div className="text-gray-600">
                      Статус: {STATUS_LABELS[selectedProspect.status as Status] ?? selectedProspect.status}
                    </div>
                    {selectedProspect.opening_hours &&
                      selectedProspect.opening_hours.length > 0 && (
                        <div className="mt-1.5 pt-1.5 border-t border-gray-200">
                          <div className="font-medium text-gray-700">Часы работы:</div>
                          {selectedProspect.opening_hours.map((line, i) => (
                            <div key={i} className="text-gray-500 text-xs leading-snug">
                              {line}
                            </div>
                          ))}
                        </div>
                      )}
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          )}
        </div>
      </div>

      {/* Add new prospect */}
      <form
        onSubmit={add}
        className="rounded-2xl border-2 border-cream-200 bg-white p-4 flex flex-col sm:flex-row gap-3 sm:items-end"
      >
        <div className="flex-1">
          <label className="block text-xs text-charcoal-500 mb-1">Название</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Название заведения"
            className="w-full rounded-lg border border-cream-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs text-charcoal-500 mb-1">Адрес</label>
          <input
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Адрес"
            className="w-full rounded-lg border border-cream-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="w-full sm:w-28">
          <label className="block text-xs text-charcoal-500 mb-1">Отзывы</label>
          <input
            type="number"
            value={form.reviews_count}
            onChange={(e) => setForm({ ...form, reviews_count: e.target.value })}
            placeholder="0"
            className="w-full rounded-lg border border-cream-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={adding || !form.name.trim()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-brown-500 text-white font-semibold text-sm hover:bg-brown-600 transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4" /> Добавить
        </button>
      </form>

      {/* Table */}
      <div className="rounded-2xl border-2 border-cream-200 bg-white overflow-hidden">
        {loading ? (
          <div className="py-12 flex items-center justify-center text-charcoal-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : visible.length === 0 ? (
          <div className="py-12 text-center text-charcoal-500">
            Нет заведений в этой категории.
          </div>
        ) : (
          <>
          {/* Mobile: stacked cards */}
          <div className="sm:hidden divide-y divide-cream-100">
            {visible.map((p) => (
              <div key={p.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-charcoal-800">{p.name}</div>
                  <button
                    onClick={() => remove(p.id)}
                    className="text-charcoal-400 hover:text-red-500 transition-colors shrink-0"
                    aria-label="Удалить"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {p.address && (
                  <div className="text-sm text-charcoal-600">{p.address}</div>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-charcoal-500">
                  <span>Отзывы: {p.reviews_count ?? '—'}</span>
                  <span>Сегодня: {todayHours(p.opening_hours) ?? '—'}</span>
                </div>
                <select
                  value={p.status}
                  onChange={(e) => updateStatus(p.id, e.target.value)}
                  className={`w-full rounded-lg border px-2.5 py-2 text-sm font-semibold ${
                    STATUS_BADGE[(p.status as Status)] ?? STATUS_BADGE.new
                  }`}
                >
                  {STATUS_ORDER.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-cream-50 text-charcoal-500 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Название</th>
                  <th className="px-4 py-3 font-medium">Адрес</th>
                  <th className="px-4 py-3 font-medium text-right">Отзывы</th>
                  <th className="px-4 py-3 font-medium">Часы сегодня</th>
                  <th className="px-4 py-3 font-medium">Статус</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => (
                  <tr key={p.id} className="border-t border-cream-100 hover:bg-cream-50/50">
                    <td className="px-4 py-3 font-medium text-charcoal-800">{p.name}</td>
                    <td className="px-4 py-3 text-charcoal-600">{p.address ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-charcoal-600">
                      {p.reviews_count ?? '—'}
                    </td>
                    <td
                      className="px-4 py-3 text-charcoal-600 whitespace-nowrap"
                      title={p.opening_hours?.join('\n') ?? ''}
                    >
                      {todayHours(p.opening_hours) ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={p.status}
                        onChange={(e) => updateStatus(p.id, e.target.value)}
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                          STATUS_BADGE[(p.status as Status)] ?? STATUS_BADGE.new
                        }`}
                      >
                        {STATUS_ORDER.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => remove(p.id)}
                        className="text-charcoal-400 hover:text-red-500 transition-colors"
                        aria-label="Удалить"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </div>
  );
}
