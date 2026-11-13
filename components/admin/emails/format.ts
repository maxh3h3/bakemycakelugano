import type { EmailMessage, OutgoingAttachment } from '@/lib/email/types';

// ── Message text ────────────────────────────────────────────────────────────

/** Lines that start the quoted history a mail app appends under a reply. */
const QUOTE_START = [
  /^>/,
  /^On .{6,200} wrote:$/i,                                  // Gmail / Apple (EN)
  /^Il .{5,200} ha scritto:?$/i,                            // IT
  /^Le .{5,200} a écrit\s*:?$/i,                            // FR
  /^Am .{5,200} schrieb.*:?$/i,                             // DE
  /написал(а)?:?$/i,                                        // RU
  /^-{2,}\s*(Original Message|Messaggio originale|Message d'origine|Ursprüngliche Nachricht|Forwarded message|Messaggio inoltrato)/i,
  /^_{3,}$/,
  /^(From|Da|De|Von|От):\s+\S/,                             // Outlook header block
];

function isQuoteStart(lines: string[], i: number): boolean {
  const line = lines[i].trim();
  // Gmail wraps long "On …, Name <email> wrote:" lines, so also try two joined.
  const joined = `${line} ${(lines[i + 1] || '').trim()}`;
  return QUOTE_START.some(p => p.test(line) || p.test(joined));
}

function htmlToText(html: string): string {
  return html
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, '\n')
    .replace(/<blockquote[^>]*>/i, '\n>\n')                 // marks where quoted history starts
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** A message split into what was written now and the quoted history below it. */
export function messageText(email: Pick<EmailMessage, 'body_text' | 'body_html'>): { body: string; quoted: string } {
  const text = (email.body_text || htmlToText(email.body_html || '')).replace(/\r\n/g, '\n');
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (isQuoteStart(lines, i)) {
      const body = lines.slice(0, i).join('\n').trim();
      const quoted = lines.slice(i).join('\n').trim();
      // A message that is only a quote (e.g. a bare forward) keeps its text visible.
      return body ? { body, quoted } : { body: quoted, quoted: '' };
    }
  }
  return { body: text.trim(), quoted: '' };
}

/** Plain transcript of a thread, for the AI draft and order extraction. */
export function threadTranscript(emails: EmailMessage[], maxPerMessage = 800): string {
  return emails
    .map(e => {
      const who = e.direction === 'inbound' ? e.from_email : 'Bake My Cake';
      return `[${who} — ${new Date(e.email_date).toLocaleDateString('it-CH')}]\n${messageText(e).body.slice(0, maxPerMessage)}`;
    })
    .join('\n---\n');
}

/** Subject without the Re:/Fwd: chain, to tell when a thread changes topic. */
export function baseSubject(subject: string | null): string {
  return (subject || '').replace(/^((re|fwd?|aw|wg|r|i|tr)\s*:\s*)+/i, '').trim().toLowerCase();
}

// ── People ──────────────────────────────────────────────────────────────────

export function displayName(name: string | null, email: string): string {
  if (name) return name;
  const local = email.split('@')[0] || email;
  return local.replace(/[._-]+/g, ' ').replace(/\d+$/, '').trim() || local;
}

export function initials(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] || '?').slice(0, 2);
  return letters.toUpperCase();
}

// ── Dates (the admin UI is in Russian) ──────────────────────────────────────

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export function listDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (sameDay(d, now)) return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, yesterday)) return 'вчера';
  if (d.getFullYear() === now.getFullYear()) return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export function dayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (sameDay(d, now)) return 'Сегодня';
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, yesterday)) return 'Вчера';
  return d.toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', ...(d.getFullYear() !== now.getFullYear() && { year: 'numeric' }),
  });
}

export const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

export const isSameDay = (a: string, b: string) => sameDay(new Date(a), new Date(b));

// ── Files ───────────────────────────────────────────────────────────────────

export function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function filesToPayload(files: File[]): Promise<OutgoingAttachment[]> {
  return Promise.all(
    files.map(
      file =>
        new Promise<OutgoingAttachment>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () =>
            resolve({ filename: file.name, contentType: file.type, base64: String(reader.result).split(',')[1] });
          reader.onerror = () => reject(new Error(`Не удалось прочитать ${file.name}`));
          reader.readAsDataURL(file);
        }),
    ),
  );
}
