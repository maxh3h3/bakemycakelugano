import type { AIExtractedOrderData } from '@/types/ai-order';
import type { EmailAttachment, EmailThreadDetail, EmailThreadSummary, OutgoingAttachment } from '@/lib/email/types';

/** fetch + JSON that throws with the server's error message instead of failing silently. */
async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Ошибка ${res.status}`);
  return data as T;
}

const post = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const EMPTY_ORDER: AIExtractedOrderData = { channel: 'email', order_items: [] };

export interface SendPayload {
  to: string;
  subject: string;
  body: string;
  orderId?: string | null;
  inReplyToMessageId?: string | null;
  attachments: OutgoingAttachment[];
}

export const emailApi = {
  threads: () => call<{ threads: EmailThreadSummary[] }>('/api/admin/emails').then(d => d.threads),

  thread: (contact: string) =>
    call<EmailThreadDetail>(`/api/admin/emails/thread?contact=${encodeURIComponent(contact)}`),

  send: (payload: SendPayload) => call<{ success: true }>('/api/admin/emails/send', post(payload)),

  draft: (ownerNote: string, threadContext: string) =>
    call<{ draft: string }>('/api/admin/emails/draft', post({ ownerNote, threadContext })).then(d => d.draft),

  downloadAttachments: (emailId: string) =>
    call<{ attachments: EmailAttachment[] }>('/api/admin/emails/attachments', post({ emailId })).then(d => d.attachments),

  hideThread: (contact: string) =>
    call<{ deleted: true }>(`/api/admin/emails/thread/delete?contact=${encodeURIComponent(contact)}`, { method: 'DELETE' }),

  linkToOrder: (contact: string, orderId: string) =>
    call<{ linked: number }>('/api/admin/emails/link', post({ contact, orderId })),

  extractOrder: async (text: string): Promise<AIExtractedOrderData> => {
    const d = await call<{ success: boolean; data?: AIExtractedOrderData }>(
      '/api/admin/orders/ai-extract',
      post({ text, context: { currentDate: new Date().toISOString().split('T')[0] } }),
    );
    // The order came from an email thread; prefill that channel unless the AI saw otherwise.
    return d.success && d.data ? { channel: 'email', ...d.data } : EMPTY_ORDER;
  },
};
