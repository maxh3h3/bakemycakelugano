'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import CreateOrderModal from '@/components/admin/CreateOrderModal';
import type { AIExtractedOrderData } from '@/types/ai-order';

interface EmailThread {
  contact: string;
  latestSubject: string;
  latestDate: string;
  preview: string;
  count: number;
  linkedOrderId: string | null;
}

interface AttachmentMeta {
  name: string;
  contentType: string;
  size: number;
  part: string;
  uid: number;
  url: string | null;
}

interface EmailMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  from_email: string;
  to_email: string;
  subject: string;
  body_text: string;
  body_html: string;
  message_id: string | null;
  email_date: string;
  attachments: AttachmentMeta[];
}

interface ThreadDetail {
  emails: EmailMessage[];
  order: any | null;
  contact: string;
}

const QUOTE_PATTERNS = [
  /^>/,
  /^On .{10,100} wrote:$/,
  /^Il .{5,80} ha scritto:/i,
  /^Le .{5,80} a écrit\s*:/i,
  /^Am .{5,80} schrieb/i,
  /^-{3,}\s*(Original Message|Forwarded)/i,
  /^_{3,}$/,
  /^From:\s+\S/,
];

function stripQuotes(text: string): string {
  if (!text) return '';
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (QUOTE_PATTERNS.some(p => p.test(lines[i].trim()))) {
      return lines.slice(0, i).join('\n').trim() || text.trim();
    }
  }
  return text.trim();
}

function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n').trim();
}

function getBody(bodyText: string, bodyHtml: string): string {
  return stripQuotes(bodyText || htmlToText(bodyHtml || ''));
}

export default function EmailsPageClient() {
  const [threads, setThreads] = useState<EmailThread[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<ThreadDetail | null>(null);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [input, setInput] = useState('');
  const [draft, setDraft] = useState('');
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);
  const [showDraft, setShowDraft] = useState(false);
  const [confirmText, setConfirmText] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [extractingOrder, setExtractingOrder] = useState(false);
  const [orderModalData, setOrderModalData] = useState<AIExtractedOrderData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/admin/emails')
      .then(r => r.json())
      .then(d => setThreads(d.threads || []))
      .finally(() => setLoadingThreads(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [detail?.emails]);

  const selectThread = useCallback(async (contact: string) => {
    setSelected(contact);
    setDetail(null);
    setShowDraft(false);
    setDraft('');
    setInput('');
    setLoadingDetail(true);
    const r = await fetch(`/api/admin/emails/thread?contact=${encodeURIComponent(contact)}`);
    const d = await r.json();
    setDetail(d);
    setLoadingDetail(false);
  }, []);

  const enhanceWithAI = async () => {
    if (!input.trim() || !detail) return;
    setDrafting(true);
    const r = await fetch('/api/admin/emails/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: detail.order?.id || null,
        ownerNote: input,
        threadContext: detail.emails.map(e =>
          `[${e.direction === 'inbound' ? e.from_email : 'Вы'} — ${new Date(e.email_date).toLocaleDateString()}]\n${e.body_text?.slice(0, 500)}`
        ).join('\n---\n'),
      }),
    });
    const d = await r.json();
    setDraft(d.draft || '');
    setShowDraft(true);
    setDrafting(false);
  };

  const sendReply = async (body: string) => {
    if (!body.trim() || !detail) return;
    setSending(true);

    // Encode attached files as base64
    const encodedAttachments = await Promise.all(
      attachedFiles.map(file => new Promise<{ filename: string; contentType: string; base64: string }>(resolve => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve({ filename: file.name, contentType: file.type, base64 });
        };
        reader.readAsDataURL(file);
      }))
    );

    const lastInbound = [...detail.emails].reverse().find(e => e.direction === 'inbound');
    await fetch('/api/admin/emails/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: detail.order?.id || null,
        to: detail.contact,
        subject: `Re: ${lastInbound?.subject || detail.emails[0]?.subject || ''}`,
        body,
        inReplyToMessageId: lastInbound?.message_id || null,
        attachments: encodedAttachments,
      }),
    });
    await selectThread(detail.contact);
    setInput('');
    setDraft('');
    setShowDraft(false);
    setAttachedFiles([]);
    setSending(false);
  };


  const downloadAttachments = async (emailId: string) => {
    setDownloadingId(emailId);
    const r = await fetch('/api/admin/emails/attachments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailId }),
    });
    const data = await r.json();
    // Update the email in local state with the resolved URLs
    setDetail(prev => prev ? {
      ...prev,
      emails: prev.emails.map(e => e.id === emailId ? { ...e, attachments: data.attachments } : e),
    } : prev);
    setDownloadingId(null);
  };

  const openCreateOrder = async () => {
    if (!detail) return;
    setExtractingOrder(true);
    const threadText = detail.emails
      .map(e => `[${e.direction === 'inbound' ? e.from_email : 'Bakery'}]\n${e.body_text?.slice(0, 800) || ''}`)
      .join('\n\n---\n\n');

    const r = await fetch('/api/admin/orders/ai-extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `Contact email: ${detail.contact}\n\n${threadText}`,
        context: { currentDate: new Date().toISOString().split('T')[0] },
      }),
    });
    const data = await r.json();
    setOrderModalData(data.success ? data.data : {} as AIExtractedOrderData);
    setExtractingOrder(false);
  };

  const handleOrderCreated = async (orderId: string, orderNumber: string) => {
    if (!detail?.contact) return;
    // Link all unlinked emails for this contact to the new order
    await fetch('/api/admin/emails/link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact: detail.contact, orderId }),
    });
    // Refresh thread — will now show the linked order card
    await selectThread(detail.contact);
  };

  return (
    <div className="flex gap-6 h-[calc(100vh-12rem)]">

      {/* Thread list */}
      <div className="w-72 flex-shrink-0 bg-white rounded-2xl shadow-sm border border-cream-200 overflow-y-auto">
        <div className="px-4 py-3 border-b border-cream-100">
          <span className="text-xs font-medium text-charcoal-400 uppercase tracking-wide">Переписка</span>
        </div>
        {loadingThreads ? (
          <p className="p-6 text-center text-sm text-charcoal-400">Загрузка...</p>
        ) : threads.length === 0 ? (
          <p className="p-6 text-center text-sm text-charcoal-400">Нет писем</p>
        ) : threads.map((t, i) => (
          <div key={t.contact}>
            {i > 0 && <div className="border-t border-cream-100 mx-3" />}
            <button
              onClick={() => selectThread(t.contact)}
              className={`w-full text-left px-4 py-3 transition-colors ${selected === t.contact ? 'bg-cream-100' : 'hover:bg-cream-50'}`}
            >
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <span className="font-medium text-sm text-charcoal-900 truncate">
                  {t.contact.split('@')[0]}
                </span>
                <span className="text-xs text-charcoal-400 flex-shrink-0">
                  {new Date(t.latestDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                </span>
              </div>
              <p className="text-xs text-charcoal-600 truncate">{t.latestSubject}</p>
              <p className="text-xs text-charcoal-400 truncate mt-0.5">{t.preview}</p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="text-xs text-charcoal-400">{t.contact}</span>
                {t.count > 1 && <span className="text-xs text-charcoal-400 ml-auto">{t.count} сообщ.</span>}
              </div>
            </button>
          </div>
        ))}
      </div>

      {/* Thread detail */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-cream-200 overflow-hidden min-w-0">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-charcoal-400 text-sm">
            Выберите переписку
          </div>
        ) : loadingDetail ? (
          <div className="flex-1 flex items-center justify-center text-charcoal-400 text-sm">Загрузка...</div>
        ) : detail ? (
          <>
            {/* Header */}
            <div className="px-5 py-3 border-b border-cream-100 bg-cream-50 flex items-center justify-between flex-shrink-0">
              <div>
                <span className="font-medium text-sm text-charcoal-900">{detail.contact}</span>
                {detail.order && (
                  <span className="ml-3 text-xs font-mono bg-white border border-cream-200 px-2 py-0.5 rounded text-charcoal-600">
                    {detail.order.order_number}
                  </span>
                )}
              </div>
              {!detail.order && (
                <button
                  onClick={openCreateOrder}
                  disabled={extractingOrder}
                  className="text-xs bg-brown-500 text-white px-3 py-1.5 rounded-lg hover:bg-brown-600 disabled:opacity-50 transition-colors"
                >
                  {extractingOrder ? '⏳ Анализ...' : '+ Создать заказ'}
                </button>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {detail.emails.map(email => {
                const isOutbound = email.direction === 'outbound';
                const body = getBody(email.body_text, email.body_html);
                return (
                  <div key={email.id} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[78%] rounded-2xl px-4 py-3 ${isOutbound ? 'bg-charcoal-900 text-white rounded-tr-sm' : 'bg-cream-100 text-charcoal-900 rounded-tl-sm'}`}>
                      <div className={`text-xs mb-1.5 flex gap-2 ${isOutbound ? 'text-charcoal-400 justify-end' : 'text-charcoal-400'}`}>
                        <span>{isOutbound ? 'Вы' : email.from_email}</span>
                        <span>·</span>
                        <span>{new Date(email.email_date).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      {body
                        ? <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">{body}</pre>
                        : <span className="text-sm italic text-charcoal-400">(нет текста)</span>
                      }


                      {/* Attachments */}
                      {email.attachments?.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                          {/* Images with URLs — show as thumbnails */}
                          {email.attachments.some(a => a.url && a.contentType.startsWith('image/')) && (
                            <div className="flex flex-wrap gap-1.5">
                              {email.attachments.filter(a => a.url && a.contentType.startsWith('image/')).map((att, i) => (
                                <a key={i} href={att.url!} target="_blank" rel="noopener noreferrer">
                                  <img src={att.url!} alt={att.name} className="rounded-lg w-24 h-24 object-cover border border-white/20 hover:opacity-90 transition-opacity" />
                                </a>
                              ))}
                            </div>
                          )}

                          {/* Non-image files with URLs */}
                          {email.attachments.filter(a => a.url && !a.contentType.startsWith('image/')).map((att, i) => (
                            <a key={i} href={att.url!} target="_blank" rel="noopener noreferrer"
                              className={`flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg border w-fit ${isOutbound ? 'border-charcoal-600 text-charcoal-200 hover:bg-charcoal-800' : 'border-cream-300 text-charcoal-600 hover:bg-cream-200'} transition-colors`}>
                              📄 {att.name} <span className="opacity-60">{(att.size / 1024).toFixed(0)}KB</span>
                            </a>
                          ))}

                          {/* Placeholder cards for not-yet-downloaded attachments */}
                          {email.attachments.some(a => !a.url) && (
                            <div className="space-y-1">
                              {email.attachments.filter(a => !a.url).map((att, i) => (
                                <div key={i} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs ${isOutbound ? 'bg-charcoal-800 text-charcoal-300' : 'bg-cream-200 text-charcoal-500'}`}>
                                  <span>{att.contentType.startsWith('image/') ? '🖼️' : '📄'}</span>
                                  <span className="truncate max-w-[160px]">{att.name}</span>
                                  <span className="opacity-60 ml-auto flex-shrink-0">{(att.size / 1024).toFixed(0)}KB</span>
                                </div>
                              ))}
                              <button
                                onClick={() => downloadAttachments(email.id)}
                                disabled={downloadingId === email.id}
                                className={`mt-1 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors w-full text-center ${isOutbound ? 'bg-charcoal-700 text-white hover:bg-charcoal-600' : 'bg-brown-500 text-white hover:bg-brown-600'} disabled:opacity-50`}
                              >
                                {downloadingId === email.id ? '⏳ Загрузка...' : `↓ Загрузить ${email.attachments.filter(a => !a.url).length} файл(ов)`}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Draft review */}
            {showDraft && (
              <div className="border-t border-cream-100 bg-cream-50 px-5 py-4 flex-shrink-0">
                <p className="text-xs font-medium text-charcoal-500 mb-2 uppercase tracking-wide">Черновик — проверьте перед отправкой</p>
                <textarea
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  rows={6}
                  className="w-full text-sm border border-cream-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:border-brown-400 bg-white"
                />
                <div className="flex gap-2 justify-end mt-2">
                  <button onClick={() => { setShowDraft(false); setDraft(''); }} className="px-4 py-2 text-sm text-charcoal-500 hover:text-charcoal-700">Отмена</button>
                  <button onClick={() => sendReply(draft)} disabled={sending} className="px-6 py-2 bg-brown-500 text-white text-sm rounded-xl hover:bg-brown-600 disabled:opacity-50 transition-colors">
                    {sending ? 'Отправка...' : 'Отправить'}
                  </button>
                </div>
              </div>
            )}

            {/* Chat input */}
            {!showDraft && (
              <div className="border-t border-cream-100 px-4 py-3 flex-shrink-0">
                {/* Attached file chips */}
                {attachedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {attachedFiles.map((f, i) => (
                      <span key={i} className="flex items-center gap-1 text-xs bg-cream-100 border border-cream-200 text-charcoal-700 px-2 py-1 rounded-lg">
                        📎 {f.name} <span className="text-charcoal-400">({(f.size / 1024).toFixed(0)}KB)</span>
                        <button onClick={() => setAttachedFiles(prev => prev.filter((_, j) => j !== i))} className="ml-1 text-charcoal-400 hover:text-rose-500">×</button>
                      </span>
                    ))}
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,application/pdf,.doc,.docx"
                  className="hidden"
                  onChange={e => {
                    const files = Array.from(e.target.files || []);
                    setAttachedFiles(prev => [...prev, ...files]);
                    e.target.value = '';
                  }}
                />
                <div className="flex items-end gap-2 bg-cream-50 border border-cream-200 rounded-2xl px-3 py-2 focus-within:border-brown-400 transition-colors">
                  <textarea
                    value={input}
                    onChange={e => {
                      setInput(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                    }}
                    onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && input.trim()) { e.preventDefault(); setConfirmText(input); } }}
                    placeholder="Написать ответ... (⌘Enter для отправки)"
                    rows={1}
                    className="flex-1 text-sm bg-transparent resize-none focus:outline-none text-charcoal-900 placeholder:text-charcoal-400 leading-relaxed"
                    style={{ minHeight: '24px', maxHeight: '120px' }}
                  />
                  <div className="flex items-center gap-1.5 flex-shrink-0 pb-0.5">
                    <button onClick={() => fileInputRef.current?.click()} title="Прикрепить файл" className="px-2.5 py-1.5 text-sm text-charcoal-400 hover:text-charcoal-700 hover:bg-cream-100 rounded-xl transition-colors">
                      📎
                    </button>
                    <button onClick={enhanceWithAI} disabled={drafting || !input.trim()} className="px-3 py-1.5 text-xs bg-white border border-cream-300 text-charcoal-600 rounded-xl hover:bg-cream-100 disabled:opacity-40 transition-colors">
                      {drafting ? '...' : '✦ AI'}
                    </button>
                    <button onClick={() => setConfirmText(input)} disabled={!input.trim()} className="px-3 py-1.5 text-xs bg-charcoal-900 text-white rounded-xl hover:bg-charcoal-800 disabled:opacity-40 transition-colors">
                      Отправить
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* Create order modal — pre-populated via AI extraction from thread */}
      {orderModalData !== null && (
        <CreateOrderModal
          onClose={() => setOrderModalData(null)}
          initialData={orderModalData}
          onSuccess={handleOrderCreated}
        />
      )}

      {/* Confirmation modal for direct (non-AI) sends */}
      {confirmText && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="font-heading font-bold text-charcoal-900 text-lg mb-1">Отправить без проверки AI?</h3>
            <p className="text-charcoal-500 text-sm mb-4">Убедитесь, что сообщение понятно клиенту. Или нажмите «✦ AI», чтобы улучшить текст.</p>
            <div className="bg-cream-50 border border-cream-200 rounded-xl px-4 py-3 mb-3 text-sm text-charcoal-700 whitespace-pre-wrap max-h-40 overflow-y-auto">
              {confirmText}
            </div>
            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {attachedFiles.map((f, i) => (
                  <span key={i} className="text-xs bg-cream-100 border border-cream-200 text-charcoal-600 px-2 py-1 rounded-lg">
                    📎 {f.name}
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmText(null)}
                className="px-4 py-2 text-sm text-charcoal-500 hover:text-charcoal-700 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={() => { sendReply(confirmText); setConfirmText(null); }}
                disabled={sending}
                className="px-6 py-2 bg-charcoal-900 text-white text-sm rounded-xl hover:bg-charcoal-800 disabled:opacity-50 transition-colors"
              >
                {sending ? 'Отправка...' : 'Всё равно отправить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
