'use client';

import { useMemo, useState } from 'react';
import { Loader2, PenSquare, Search, X, Cake } from 'lucide-react';
import type { EmailThreadSummary } from '@/lib/email/types';
import { displayName, initials, listDate } from './format';
import { OrderBadge, orderDate } from './OrderMeta';

type Filter = 'all' | 'awaiting';

interface ThreadListProps {
  threads: EmailThreadSummary[];
  loading: boolean;
  error: string | null;
  selected: string | null;
  onSelect: (contact: string) => void;
  onCompose: () => void;
  onRetry: () => void;
}

export default function ThreadList({ threads, loading, error, selected, onSelect, onCompose, onRetry }: ThreadListProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const awaitingCount = useMemo(() => threads.filter(t => t.awaitingReply).length, [threads]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return threads.filter(t => {
      if (filter === 'awaiting' && !t.awaitingReply) return false;
      if (!q) return true;
      return [t.name, t.contact, t.latestSubject, t.preview].some(v => v?.toLowerCase().includes(q));
    });
  }, [threads, query, filter]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 pt-4">
        <h2 className="font-heading text-lg font-bold text-charcoal-900">Переписка</h2>
        <button
          onClick={onCompose}
          className="flex items-center gap-1.5 rounded-xl bg-brown-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brown-600"
        >
          <PenSquare size={14} /> Написать
        </button>
      </div>

      {/* Search + filter */}
      <div className="space-y-2 px-4 pb-3 pt-3">
        <label className="flex items-center gap-2 rounded-xl border border-cream-200 bg-cream-50 px-3 py-2 focus-within:border-brown-400">
          <Search size={14} className="shrink-0 text-charcoal-500" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Поиск по имени, адресу, теме"
            className="w-full bg-transparent text-sm text-charcoal-900 placeholder:text-charcoal-500 focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} aria-label="Очистить поиск" className="text-charcoal-500 hover:text-charcoal-900">
              <X size={14} />
            </button>
          )}
        </label>
        <div className="flex gap-1 rounded-xl bg-cream-100 p-1 text-sm" role="tablist">
          {([
            ['all', 'Все', threads.length],
            ['awaiting', 'Ждут ответа', awaitingCount],
          ] as const).map(([key, label, n]) => (
            <button
              key={key}
              role="tab"
              aria-selected={filter === key}
              onClick={() => setFilter(key)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 transition-colors ${
                filter === key ? 'bg-white font-medium text-charcoal-900 shadow-sm' : 'text-charcoal-500 hover:text-charcoal-900'
              }`}
            >
              {label}
              <span className={`rounded-full px-1.5 text-xs tabular-nums ${
                key === 'awaiting' && n > 0 ? 'bg-brown-500 text-white' : 'bg-cream-200 text-charcoal-700'
              }`}>
                {n}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto border-t border-cream-200">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-8 text-sm text-charcoal-500">
            <Loader2 size={16} className="animate-spin" /> Загрузка…
          </div>
        ) : error ? (
          <div className="p-6 text-center text-sm">
            <p className="text-red-700">{error}</p>
            <button onClick={onRetry} className="mt-2 text-brown-600 underline underline-offset-2">Повторить</button>
          </div>
        ) : visible.length === 0 ? (
          <p className="p-8 text-center text-sm text-charcoal-500">
            {query ? 'Ничего не найдено' : filter === 'awaiting' ? 'Все ответы отправлены 🎉' : 'Писем пока нет'}
          </p>
        ) : (
          <ul>
            {visible.map(t => {
              const label = displayName(t.name, t.contact);
              const active = selected === t.contact;
              return (
                <li key={t.contact}>
                  <button
                    onClick={() => onSelect(t.contact)}
                    aria-current={active ? 'true' : undefined}
                    className={`flex w-full gap-3 border-b border-cream-100 px-4 py-3 text-left transition-colors ${
                      active ? 'bg-cream-200/60' : 'hover:bg-cream-50'
                    }`}
                  >
                    <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      t.awaitingReply ? 'bg-brown-500 text-white' : 'bg-cream-200 text-brown-700'
                    }`}>
                      {initials(label)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-2">
                        <span className={`truncate text-sm capitalize text-charcoal-900 ${t.awaitingReply ? 'font-semibold' : 'font-medium'}`}>
                          {label}
                        </span>
                        <span className={`ml-auto shrink-0 text-xs tabular-nums ${t.awaitingReply ? 'font-medium text-brown-600' : 'text-charcoal-500'}`}>
                          {listDate(t.latestDate)}
                        </span>
                      </span>
                      <span className={`block truncate text-sm ${t.awaitingReply ? 'text-charcoal-900' : 'text-charcoal-700'}`}>
                        {t.latestSubject}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-xs text-charcoal-500">
                        {t.latestDirection === 'outbound' && <span className="shrink-0">Вы:</span>}
                        <span className="truncate">{t.preview || '—'}</span>
                      </span>
                      {t.order && (
                        <span className="mt-1.5 flex items-center gap-1.5 text-xs">
                          <Cake size={12} className={t.order.state === 'closed' ? 'shrink-0 text-charcoal-500' : 'shrink-0 text-brown-500'} />
                          <span className={t.order.state === 'closed' ? 'text-charcoal-500' : 'font-medium text-charcoal-900'}>
                            {orderDate(t.order)}
                          </span>
                          <OrderBadge order={t.order} />
                          {t.orderCount > 1 && <span className="ml-auto shrink-0 text-charcoal-500">+{t.orderCount - 1}</span>}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
