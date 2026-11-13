'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Mail } from 'lucide-react';
import CreateOrderModal from '@/components/admin/CreateOrderModal';
import type { AIExtractedOrderData } from '@/types/ai-order';
import type { EmailThreadDetail, EmailThreadSummary } from '@/lib/email/types';
import ConfirmDialog from './ConfirmDialog';
import NewEmail from './NewEmail';
import ThreadList from './ThreadList';
import ThreadView from './ThreadView';
import { EMPTY_ORDER, emailApi } from './api';
import { displayName, filesToPayload, threadTranscript } from './format';

type View = { kind: 'none' } | { kind: 'thread'; contact: string } | { kind: 'new' };

const REFRESH_MS = 2 * 60 * 1000; // the mailbox sync runs every 2 minutes

export default function EmailsPage() {
  const [threads, setThreads] = useState<EmailThreadSummary[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [threadsError, setThreadsError] = useState<string | null>(null);

  const [view, setView] = useState<View>({ kind: 'none' });
  const [detail, setDetail] = useState<EmailThreadDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const openContact = useRef<string | null>(null); // drops responses for a thread no longer open

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [extractingOrder, setExtractingOrder] = useState(false);
  const [orderDraft, setOrderDraft] = useState<AIExtractedOrderData | null>(null);
  const [hideTarget, setHideTarget] = useState<string | null>(null);
  const [hiding, setHiding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // ── Loading ─────────────────────────────────────────────────────────────

  const loadThreads = useCallback(async (silent = false) => {
    if (!silent) { setThreadsLoading(true); setThreadsError(null); }
    try {
      setThreads(await emailApi.threads());
      setThreadsError(null);
    } catch (e) {
      if (!silent) setThreadsError((e as Error).message);
    } finally {
      if (!silent) setThreadsLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (contact: string, silent = false) => {
    if (!silent) { setDetailLoading(true); setDetailError(null); }
    try {
      const d = await emailApi.thread(contact);
      if (openContact.current === contact) setDetail(d);
    } catch (e) {
      if (openContact.current === contact && !silent) setDetailError((e as Error).message);
    } finally {
      if (openContact.current === contact && !silent) setDetailLoading(false);
    }
  }, []);

  useEffect(() => { void loadThreads(); }, [loadThreads]);

  // New mail arrives through the background sync, so keep the list fresh.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== 'visible') return;
      void loadThreads(true);
      if (openContact.current) void loadDetail(openContact.current, true);
    };
    const id = window.setInterval(refresh, REFRESH_MS);
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(id); window.removeEventListener('focus', refresh); };
  }, [loadThreads, loadDetail]);

  const flash = (text: string) => {
    setNotice(text);
    window.setTimeout(() => setNotice(n => (n === text ? null : n)), 3500);
  };

  // ── Navigation ──────────────────────────────────────────────────────────

  const openThread = (contact: string) => {
    openContact.current = contact;
    setView({ kind: 'thread', contact });
    setDetail(null);
    void loadDetail(contact);
  };

  const closeView = () => {
    openContact.current = null;
    setView({ kind: 'none' });
    setDetail(null);
  };

  const openNew = () => {
    openContact.current = null;
    setDetail(null);
    setView({ kind: 'new' });
  };

  // ── Actions ─────────────────────────────────────────────────────────────

  const reply = async (body: string, files: File[]) => {
    if (!detail) return;
    const last = detail.emails.at(-1);
    const lastWithId = [...detail.emails].reverse().find(e => e.message_id);
    const subject = last?.subject || 'Bake My Cake';
    await emailApi.send({
      to: detail.contact,
      subject: /^re:/i.test(subject) ? subject : `Re: ${subject}`,
      body,
      orderId: detail.orders.find(o => o.state === 'open')?.id ?? null,
      inReplyToMessageId: lastWithId?.message_id ?? null,
      attachments: await filesToPayload(files),
    });
    flash('Письмо отправлено');
    await Promise.all([loadDetail(detail.contact, true), loadThreads(true)]);
  };

  const sendNew = async (to: string, subject: string, body: string, files: File[]) => {
    await emailApi.send({ to, subject, body, attachments: await filesToPayload(files) });
    flash('Письмо отправлено');
    await loadThreads(true);
    openThread(to);
  };

  const downloadAttachments = async (emailId: string) => {
    setDownloadingId(emailId);
    try {
      const attachments = await emailApi.downloadAttachments(emailId);
      setDetail(d => d && { ...d, emails: d.emails.map(e => (e.id === emailId ? { ...e, attachments } : e)) });
    } catch (e) {
      flash(`Вложения не загрузились: ${(e as Error).message}`);
    } finally {
      setDownloadingId(null);
    }
  };

  const createOrder = async () => {
    if (!detail) return;
    setExtractingOrder(true);
    try {
      setOrderDraft(await emailApi.extractOrder(`Contact email: ${detail.contact}\n\n${threadTranscript(detail.emails)}`));
    } catch {
      setOrderDraft(EMPTY_ORDER); // AI failed: open the empty form rather than nothing
    } finally {
      setExtractingOrder(false);
    }
  };

  const orderCreated = async (orderId: string) => {
    if (!detail) return;
    const contact = detail.contact;
    try {
      await emailApi.linkToOrder(contact, orderId);
    } catch (e) {
      flash(`Заказ создан, но письма не привязались: ${(e as Error).message}`);
    }
    await Promise.all([loadDetail(contact, true), loadThreads(true)]);
  };

  const hideThread = async () => {
    if (!hideTarget) return;
    setHiding(true);
    try {
      await emailApi.hideThread(hideTarget);
      setThreads(ts => ts.filter(t => t.contact !== hideTarget));
      if (openContact.current === hideTarget) closeView();
      setHideTarget(null);
    } catch (e) {
      flash(`Не удалось убрать: ${(e as Error).message}`);
    } finally {
      setHiding(false);
    }
  };

  // ── Layout ──────────────────────────────────────────────────────────────
  // Phones show one pane at a time; from md up the list sits beside the thread.

  const paneOpen = view.kind !== 'none';
  const selected = view.kind === 'thread' ? view.contact : null;
  const awaiting = threads.filter(t => t.awaitingReply).length;
  const hideSummary = hideTarget ? threads.find(t => t.contact === hideTarget) : undefined;

  return (
    // Fills the viewport under the 4rem admin header (and the page title from md up).
    <div className="relative flex h-[calc(100dvh-6rem)] min-h-[480px] overflow-hidden rounded-2xl border border-cream-200 bg-white shadow-sm md:h-[calc(100dvh-13rem)]">
      <aside className={`${paneOpen ? 'hidden' : 'flex'} w-full flex-col border-cream-200 md:flex md:w-80 md:shrink-0 md:border-r lg:w-96`}>
        <ThreadList
          threads={threads}
          loading={threadsLoading}
          error={threadsError}
          selected={selected}
          onSelect={openThread}
          onCompose={openNew}
          onRetry={() => void loadThreads()}
        />
      </aside>

      <section className={`${paneOpen ? 'flex' : 'hidden'} min-w-0 flex-1 flex-col md:flex`}>
        {view.kind === 'thread' ? (
          <ThreadView
            contact={view.contact}
            detail={detail}
            loading={detailLoading}
            error={detailError}
            extractingOrder={extractingOrder}
            downloadingId={downloadingId}
            onBack={closeView}
            onRetry={() => void loadDetail(view.contact)}
            onReply={reply}
            onCreateOrder={createOrder}
            onDelete={() => setHideTarget(view.contact)}
            onDownloadAttachments={downloadAttachments}
          />
        ) : view.kind === 'new' ? (
          <NewEmail onBack={closeView} onSend={sendNew} />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 bg-cream-50/50 p-8 text-center">
            <Mail size={28} className="text-brown-400" />
            <p className="text-sm text-charcoal-700">Выберите переписку слева</p>
            {awaiting > 0 && (
              <p className="text-xs text-charcoal-500">{awaiting} {awaiting === 1 ? 'переписка ждёт' : 'переписок ждут'} вашего ответа</p>
            )}
          </div>
        )}
      </section>

      {notice && (
        <div className="pointer-events-none absolute inset-x-0 bottom-24 flex justify-center px-4" role="status">
          <span className="rounded-full bg-charcoal-900 px-4 py-2 text-sm text-white shadow-lg">{notice}</span>
        </div>
      )}

      {orderDraft && (
        <CreateOrderModal
          initialData={orderDraft}
          onClose={() => setOrderDraft(null)}
          onSuccess={orderId => void orderCreated(orderId)}
        />
      )}

      {hideTarget && (
        <ConfirmDialog
          title="Убрать переписку?"
          confirmLabel="Убрать"
          tone="danger"
          busy={hiding}
          onConfirm={() => void hideThread()}
          onCancel={() => setHideTarget(null)}
        >
          <p>
            Переписка с <span className="font-medium capitalize text-charcoal-900">{displayName(hideSummary?.name ?? null, hideTarget)}</span>{' '}
            <span className="break-all text-charcoal-500">({hideTarget})</span> исчезнет из списка.
          </p>
          <p className="mt-2 text-xs text-charcoal-500">В почтовом ящике письма останутся. Если клиент напишет снова, переписка появится опять.</p>
        </ConfirmDialog>
      )}
    </div>
  );
}
