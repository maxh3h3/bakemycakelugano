'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react';
import type { EmailOrder, EmailThreadDetail } from '@/lib/email/types';
import { buildConfirmationText, type ConfirmationLanguage } from '@/lib/orders/confirmation-text';
import Composer, { type ComposerSeed } from './Composer';
import MessageBubble from './MessageBubble';
import OrdersPanel from './OrdersPanel';
import { baseSubject, dayLabel, displayName, initials, isSameDay, threadTranscript } from './format';

interface ThreadViewProps {
  contact: string;
  detail: EmailThreadDetail | null;
  loading: boolean;
  error: string | null;
  extractingOrder: boolean;
  downloadingId: string | null;
  onBack: () => void;
  onRetry: () => void;
  onReply: (body: string, files: File[]) => Promise<void>;
  onCreateOrder: () => void;
  onDelete: () => void;
  onDownloadAttachments: (emailId: string) => void;
}

function confirmationFor(order: EmailOrder, lang: ConfirmationLanguage): string {
  return buildConfirmationText(
    order,
    (order.items ?? []).map(i => ({ ...i, writing_on_cake: i.writing_on_cake ?? '' })),
    lang,
  );
}

export default function ThreadView({
  contact, detail, loading, error, extractingOrder, downloadingId,
  onBack, onRetry, onReply, onCreateOrder, onDelete, onDownloadAttachments,
}: ThreadViewProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [seed, setSeed] = useState<ComposerSeed | null>(null);
  const emails = detail?.emails ?? [];
  const orders = detail?.orders ?? [];
  const label = displayName(detail?.name ?? null, contact);

  // Land on the newest message when a thread opens or grows.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [contact, emails.length]);

  const insertConfirmation = (order: EmailOrder, lang: ConfirmationLanguage) =>
    setSeed({
      key: Date.now(),
      text: confirmationFor(order, lang),
      label: `Подтверждение заказа #${order.order_number ?? ''} — проверьте надпись и детали перед отправкой`,
    });

  return (
    <div className="flex h-full min-w-0 flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-cream-200 px-3 py-3 sm:px-5">
        <button onClick={onBack} className="-ml-1 rounded-lg p-1.5 text-charcoal-700 hover:bg-cream-100 md:hidden" aria-label="Назад к списку">
          <ArrowLeft size={18} />
        </button>
        <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cream-200 text-sm font-semibold text-brown-700 sm:flex">
          {initials(label)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium capitalize text-charcoal-900">{label}</p>
          <a href={`mailto:${contact}`} className="block truncate text-xs text-charcoal-500 hover:text-brown-600">{contact}</a>
        </div>
        {detail && (
          <button
            onClick={onCreateOrder}
            disabled={extractingOrder || emails.length === 0}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-brown-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brown-600 disabled:opacity-50"
            title="AI заполнит заказ по переписке"
          >
            {extractingOrder ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            <span className="hidden sm:inline">{extractingOrder ? 'Анализ…' : orders.length ? 'Новый заказ' : 'Создать заказ'}</span>
            <span className="sm:hidden">Заказ</span>
          </button>
        )}
        <button onClick={onDelete} disabled={!detail} className="shrink-0 rounded-lg p-2 text-charcoal-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-40" title="Убрать переписку" aria-label="Убрать переписку">
          <Trash2 size={16} />
        </button>
      </div>

      {detail && <OrdersPanel orders={orders} onConfirmation={insertConfirmation} />}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-cream-50/50 px-3 py-4 sm:px-5">
        {loading ? (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-charcoal-500">
            <Loader2 size={16} className="animate-spin" /> Загрузка…
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center text-sm">
            <p className="text-red-700">{error}</p>
            <button onClick={onRetry} className="mt-2 text-brown-600 underline underline-offset-2">Повторить</button>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-3">
            {emails.map((email, i) => {
              const prev = emails[i - 1];
              const newDay = !prev || !isSameDay(prev.email_date, email.email_date);
              const topicChanged = !prev || baseSubject(prev.subject) !== baseSubject(email.subject);
              return (
                <Fragment key={email.id}>
                  {newDay && (
                    <div className="flex justify-center pt-2">
                      <span className="rounded-full bg-cream-200 px-3 py-0.5 text-xs font-medium text-charcoal-700">{dayLabel(email.email_date)}</span>
                    </div>
                  )}
                  <MessageBubble
                    email={email}
                    senderLabel={email.direction === 'outbound' ? 'Вы' : label}
                    showSubject={topicChanged}
                    downloading={downloadingId === email.id}
                    onDownloadAttachments={onDownloadAttachments}
                  />
                </Fragment>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {detail && (
        <Composer
          key={contact}
          canSend
          seed={seed}
          threadContext={() => threadTranscript(emails, 500)}
          onSend={onReply}
          placeholder="Ответ или заметка для AI-черновика…"
        />
      )}
    </div>
  );
}
