'use client';

import { useState } from 'react';
import { Download, FileText, ImageIcon, Loader2 } from 'lucide-react';
import type { EmailMessage } from '@/lib/email/types';
import { fileSize, messageText, timeOf } from './format';

interface MessageBubbleProps {
  email: EmailMessage;
  senderLabel: string;
  showSubject: boolean;
  downloading: boolean;
  onDownloadAttachments: (emailId: string) => void;
}

export default function MessageBubble({ email, senderLabel, showSubject, downloading, onDownloadAttachments }: MessageBubbleProps) {
  const [showQuoted, setShowQuoted] = useState(false);
  const outbound = email.direction === 'outbound';
  const { body, quoted } = messageText(email);
  const attachments = email.attachments ?? [];
  const images = attachments.filter(a => a.url && a.contentType.startsWith('image/'));
  const files = attachments.filter(a => a.url && !a.contentType.startsWith('image/'));
  const pending = attachments.filter(a => !a.url);

  const muted = outbound ? 'text-cream-300' : 'text-charcoal-500';

  return (
    <div className={`flex ${outbound ? 'justify-end' : 'justify-start'}`}>
      <article
        className={`max-w-[88%] rounded-2xl px-4 py-3 sm:max-w-[75%] ${
          outbound ? 'rounded-br-md bg-charcoal-900 text-white' : 'rounded-bl-md bg-cream-100 text-charcoal-900'
        }`}
      >
        <header className={`mb-1 flex items-baseline gap-2 text-xs ${muted}`}>
          <span className="truncate font-medium">{senderLabel}</span>
          <span className="ml-auto shrink-0 tabular-nums">{timeOf(email.email_date)}</span>
        </header>

        {showSubject && email.subject && (
          <p className={`mb-1.5 text-sm font-semibold ${outbound ? 'text-white' : 'text-charcoal-900'}`}>{email.subject}</p>
        )}

        {body ? (
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{body}</p>
        ) : (
          <p className={`text-sm italic ${muted}`}>(нет текста)</p>
        )}

        {quoted && (
          <div className="mt-2">
            <button
              onClick={() => setShowQuoted(v => !v)}
              className={`rounded-md px-1.5 py-0.5 text-xs ${outbound ? 'bg-white/10 text-cream-200 hover:bg-white/20' : 'bg-cream-200 text-charcoal-700 hover:bg-cream-300'}`}
              aria-expanded={showQuoted}
            >
              {showQuoted ? 'Скрыть цитату' : '··· Показать цитату'}
            </button>
            {showQuoted && (
              <p className={`mt-2 whitespace-pre-wrap break-words border-l-2 pl-3 text-xs leading-relaxed ${
                outbound ? 'border-white/20 text-cream-300' : 'border-cream-300 text-charcoal-500'
              }`}>
                {quoted}
              </p>
            )}
          </div>
        )}

        {attachments.length > 0 && (
          <div className="mt-3 space-y-2">
            {images.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {images.map((a, i) => (
                  <a key={i} href={a.url!} target="_blank" rel="noopener noreferrer" title={a.name}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.url!} alt={a.name} className="h-24 w-24 rounded-lg object-cover ring-1 ring-black/5 hover:opacity-90" />
                  </a>
                ))}
              </div>
            )}
            {files.map((a, i) => (
              <a
                key={i}
                href={a.url!}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex w-fit max-w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs ${
                  outbound ? 'bg-white/10 hover:bg-white/20' : 'bg-white hover:bg-cream-50'
                }`}
              >
                <FileText size={13} className="shrink-0" />
                <span className="truncate">{a.name}</span>
                <span className={muted}>{fileSize(a.size)}</span>
              </a>
            ))}
            {pending.length > 0 && (
              <div className={`rounded-xl p-2 ${outbound ? 'bg-white/10' : 'bg-white'}`}>
                <ul className="space-y-1">
                  {pending.map((a, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs">
                      {a.contentType.startsWith('image/') ? <ImageIcon size={13} className="shrink-0" /> : <FileText size={13} className="shrink-0" />}
                      <span className="truncate">{a.name}</span>
                      <span className={`ml-auto shrink-0 ${muted}`}>{fileSize(a.size)}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => onDownloadAttachments(email.id)}
                  disabled={downloading}
                  className={`mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-60 ${
                    outbound ? 'bg-white text-charcoal-900 hover:bg-cream-100' : 'bg-brown-500 text-white hover:bg-brown-600'
                  }`}
                >
                  {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                  {downloading ? 'Загрузка…' : `Открыть вложения (${pending.length})`}
                </button>
              </div>
            )}
          </div>
        )}
      </article>
    </div>
  );
}
