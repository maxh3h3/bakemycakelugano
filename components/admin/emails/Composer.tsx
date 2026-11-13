'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Loader2, Paperclip, RotateCcw, Send, Sparkles, X } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';
import { emailApi } from './api';
import { fileSize } from './format';

const MAX_FILE_BYTES = 10 * 1024 * 1024; // matches the send route

interface ComposerProps {
  /** False while a new email has no valid recipient yet. */
  canSend: boolean;
  /** Thread text (or "new email to …") the AI drafts against. */
  threadContext: () => string;
  /** Sends the final text; throws to keep the composer filled and show the error. */
  onSend: (body: string, files: File[]) => Promise<void>;
  placeholder: string;
}

export default function Composer({ canSend, threadContext, onSend, placeholder }: ComposerProps) {
  const [note, setNote] = useState('');
  const [draft, setDraft] = useState<string | null>(null); // AI draft under review
  const [files, setFiles] = useState<File[]>([]);
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmRaw, setConfirmRaw] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reviewing = draft !== null;
  const text = reviewing ? draft : note;
  const busy = drafting || sending;

  // Grow the textarea with its content, up to a cap.
  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, reviewing ? 320 : 180)}px`;
  }, [text, reviewing]);

  const setText = (value: string) => (reviewing ? setDraft(value) : setNote(value));

  const addFiles = (list: FileList | null) => {
    const picked = Array.from(list ?? []);
    const tooBig = picked.find(f => f.size > MAX_FILE_BYTES);
    if (tooBig) setError(`${tooBig.name} больше 10 MB`);
    setFiles(prev => [...prev, ...picked.filter(f => f.size <= MAX_FILE_BYTES)]);
  };

  const generateDraft = async () => {
    if (!note.trim() || busy) return;
    setDrafting(true);
    setError(null);
    try {
      setDraft(await emailApi.draft(note, threadContext()));
      requestAnimationFrame(() => textRef.current?.focus());
    } catch (e) {
      setError(`AI не ответил: ${(e as Error).message}`);
    } finally {
      setDrafting(false);
    }
  };

  const send = async (body: string) => {
    setConfirmRaw(false);
    setSending(true);
    setError(null);
    try {
      await onSend(body.trim(), files);
      setNote('');
      setDraft(null);
      setFiles([]);
    } catch (e) {
      setError(`Не отправлено: ${(e as Error).message}`);
    } finally {
      setSending(false);
    }
  };

  // The AI-reviewed draft goes straight out; a raw note asks once more first.
  const primary = () => {
    if (!text.trim() || !canSend || busy) return;
    if (draft !== null) void send(draft);
    else setConfirmRaw(true);
  };

  return (
    <div className="border-t border-cream-200 bg-white px-3 pb-3 pt-2 sm:px-4">
      {reviewing && (
        <div className="mb-2 flex items-center gap-2 rounded-xl bg-cream-100 px-3 py-2 text-xs text-brown-700">
          <Sparkles size={13} className="shrink-0" />
          <span className="font-medium">Черновик AI — проверьте и при необходимости поправьте</span>
          <span className="ml-auto flex shrink-0 gap-1">
            <button onClick={generateDraft} disabled={busy} className="flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-cream-200 disabled:opacity-50" title="Сгенерировать заново">
              {drafting ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />} Заново
            </button>
            <button onClick={() => setDraft(null)} disabled={busy} className="flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-cream-200 disabled:opacity-50" title="Вернуться к заметке">
              <ArrowLeft size={12} /> К заметке
            </button>
          </span>
        </div>
      )}

      {error && (
        <div className="mb-2 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} aria-label="Закрыть"><X size={13} /></button>
        </div>
      )}

      {files.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-1.5">
          {files.map((f, i) => (
            <li key={i} className="flex max-w-full items-center gap-1.5 rounded-lg border border-cream-200 bg-cream-50 px-2 py-1 text-xs text-charcoal-700">
              <Paperclip size={11} className="shrink-0" />
              <span className="truncate">{f.name}</span>
              <span className="text-charcoal-500">{fileSize(f.size)}</span>
              <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))} aria-label={`Убрать ${f.name}`} className="text-charcoal-500 hover:text-red-600">
                <X size={11} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className={`rounded-2xl border bg-cream-50 px-3 py-2 transition-colors focus-within:border-brown-400 ${reviewing ? 'border-brown-400' : 'border-cream-200'}`}>
        <textarea
          ref={textRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); primary(); } }}
          placeholder={placeholder}
          rows={reviewing ? 6 : 2}
          disabled={sending}
          className="block w-full resize-none bg-transparent text-sm leading-relaxed text-charcoal-900 placeholder:text-charcoal-500 focus:outline-none"
        />
        <div className="mt-1 flex items-center gap-1">
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*,application/pdf,.doc,.docx"
            className="hidden"
            onChange={e => { addFiles(e.target.files); e.target.value = ''; }}
          />
          <button onClick={() => fileRef.current?.click()} disabled={busy} title="Прикрепить файл" className="rounded-lg p-2 text-charcoal-500 hover:bg-cream-100 hover:text-charcoal-900 disabled:opacity-50">
            <Paperclip size={16} />
          </button>
          {!reviewing && (
            <button
              onClick={generateDraft}
              disabled={busy || !note.trim()}
              title="AI напишет письмо по вашей заметке"
              className="flex items-center gap-1.5 rounded-lg border border-cream-300 bg-white px-2.5 py-1.5 text-xs font-medium text-brown-700 hover:bg-cream-100 disabled:opacity-40"
            >
              {drafting ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} AI-черновик
            </button>
          )}
          <span className="flex-1" />
          <span className="hidden text-xs text-charcoal-500 sm:inline">⌘ Enter</span>
          <button
            onClick={primary}
            disabled={busy || !text.trim() || !canSend}
            className="ml-2 flex items-center gap-1.5 rounded-xl bg-charcoal-900 px-4 py-2 text-sm font-medium text-white hover:bg-charcoal-700 disabled:opacity-40"
          >
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Отправить
          </button>
        </div>
      </div>

      {confirmRaw && (
        <ConfirmDialog
          title="Отправить без AI?"
          confirmLabel="Всё равно отправить"
          busy={sending}
          onConfirm={() => void send(note)}
          onCancel={() => setConfirmRaw(false)}
        >
          <p>Текст уйдёт клиенту как есть. Нажмите «AI-черновик», чтобы AI оформил письмо.</p>
          <p className="mt-3 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-xl border border-cream-200 bg-cream-50 px-3 py-2 text-charcoal-900">{note}</p>
          {files.length > 0 && <p className="mt-2 text-xs text-charcoal-500">Вложения: {files.map(f => f.name).join(', ')}</p>}
        </ConfirmDialog>
      )}
    </div>
  );
}
