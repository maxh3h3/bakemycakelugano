'use client';

import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import Composer from './Composer';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface NewEmailProps {
  onBack: () => void;
  onSend: (to: string, subject: string, body: string, files: File[]) => Promise<void>;
}

export default function NewEmail({ onBack, onSend }: NewEmailProps) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const recipient = to.trim().toLowerCase();
  const valid = EMAIL_RE.test(recipient);

  return (
    <div className="flex h-full min-w-0 flex-col">
      <div className="flex items-center gap-3 border-b border-cream-200 px-3 py-3 sm:px-5">
        <button onClick={onBack} className="-ml-1 rounded-lg p-1.5 text-charcoal-700 hover:bg-cream-100 md:hidden" aria-label="Назад к списку">
          <ArrowLeft size={18} />
        </button>
        <h2 className="font-heading text-lg font-bold text-charcoal-900">Новое письмо</h2>
      </div>

      <div className="divide-y divide-cream-200 border-b border-cream-200 text-sm">
        <label className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
          <span className="w-12 shrink-0 text-charcoal-500">Кому</span>
          <input
            type="email"
            value={to}
            onChange={e => setTo(e.target.value)}
            placeholder="client@example.com"
            autoFocus
            className="w-full bg-transparent text-charcoal-900 placeholder:text-charcoal-500 focus:outline-none"
          />
          {to && !valid && <span className="shrink-0 text-xs text-amber-700">проверьте адрес</span>}
        </label>
        <label className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
          <span className="w-12 shrink-0 text-charcoal-500">Тема</span>
          <input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Bake My Cake"
            className="w-full bg-transparent text-charcoal-900 placeholder:text-charcoal-500 focus:outline-none"
          />
        </label>
      </div>

      <div className="flex flex-1 items-center justify-center bg-cream-50/50 p-6 text-center text-sm text-charcoal-500">
        <p className="max-w-xs">Напишите текст сами или коротко опишите, что сказать, и нажмите «AI-черновик».</p>
      </div>

      <Composer
        canSend={valid}
        threadContext={() => `New email to: ${recipient}${subject.trim() ? `\nSubject: ${subject.trim()}` : ''}`}
        onSend={(body, files) => onSend(recipient, subject.trim() || 'Bake My Cake', body, files)}
        placeholder="Текст письма или заметка для AI…"
      />
    </div>
  );
}
