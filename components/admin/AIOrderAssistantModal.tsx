'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { AIExtractedOrderData, AIOrderProcessingResponse } from '@/types/ai-order';
import DatePicker from '@/components/products/DatePicker';
import t from '@/lib/admin-translations-extended';

interface AIOrderAssistantModalProps {
  onClose: () => void;
  onOrderExtracted: (data: AIExtractedOrderData) => void;
}

type ProcessingStep = 'input' | 'processing' | 'error';
type InputMode = 'standard' | 'whatsapp';

interface ParsedMessage {
  dateISO: string; // YYYY-MM-DD
  time: string;
  sender: string;
  content: string;
}

// Parse WhatsApp export format: [DD/MM/YY, HH:MM:SS] Sender: message
function parseWhatsAppChat(chatText: string): ParsedMessage[] {
  const LINE_RE = /^\[(\d{1,2})\/(\d{1,2})\/(\d{2,4}),\s+(\d{1,2}:\d{2}(?::\d{2})?)\]\s+([^:]+):\s(.*)/;
  const messages: ParsedMessage[] = [];
  let current: ParsedMessage | null = null;

  for (const line of chatText.split('\n')) {
    const m = line.match(LINE_RE);
    if (m) {
      if (current) messages.push(current);
      const [, day, month, yearRaw, time, sender, content] = m;
      const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw;
      current = {
        dateISO: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
        time,
        sender: sender.trim(),
        content: content.trim(),
      };
    } else if (current) {
      const stripped = line.trim();
      if (stripped) current.content += '\n' + stripped;
    }
  }
  if (current) messages.push(current);
  return messages;
}

function formatMessagesForAI(messages: ParsedMessage[]): string {
  return messages
    .map(msg => {
      const clean = msg.content
        .replace(/‎?(image|video|audio|sticker|document|GIF) omitted/gi, '[медиа]')
        .replace(/‎/g, '')
        .trim();
      if (!clean || clean === '[медиа]') return null;
      return `[${msg.dateISO} ${msg.time}] ${msg.sender}: ${clean}`;
    })
    .filter(Boolean)
    .join('\n');
}

// Convert YYYY-MM-DD string to local Date (no UTC shift)
function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function dateToISO(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Admin min date: allow any past/future date
const ADMIN_MIN_DATE = new Date(2000, 0, 1);

export default function AIOrderAssistantModal({ onClose, onOrderExtracted }: AIOrderAssistantModalProps) {
  const [step, setStep] = useState<ProcessingStep>('input');
  const [inputMode, setInputMode] = useState<InputMode>('standard');
  const [textInput, setTextInput] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // WhatsApp mode state
  const [waChat, setWaChat] = useState('');
  const [waFileName, setWaFileName] = useState('');
  const [waFromDate, setWaFromDate] = useState<Date | undefined>(undefined);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const waChatFileRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const waParsed = useMemo<ParsedMessage[]>(() => {
    if (!waChat.trim()) return [];
    return parseWhatsAppChat(waChat);
  }, [waChat]);

  const waFiltered = useMemo<ParsedMessage[]>(() => {
    if (!waParsed.length) return [];
    if (!waFromDate) return waParsed;
    const fromISO = dateToISO(waFromDate);
    return waParsed.filter(msg => msg.dateISO >= fromISO);
  }, [waParsed, waFromDate]);

  // Min/max Date objects for the DatePicker
  const waDateRange = useMemo(() => {
    if (!waParsed.length) return { minISO: '', maxISO: '', minDate: ADMIN_MIN_DATE };
    const isos = waParsed.map(m => m.dateISO).sort();
    return {
      minISO: isos[0],
      maxISO: isos[isos.length - 1],
      minDate: isoToDate(isos[0]),
    };
  }, [waParsed]);

  // Lock body scroll
  useEffect(() => {
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = orig; };
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(Array.from(e.target.files || []));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(Array.from(e.dataTransfer.files));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); }, []);

  const handleFiles = async (files: File[]) => {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) { setError(t.pleaseUploadImagesOnly); return; }
    if (images.length + imageFiles.length > 5) { setError(t.maximumImagesAllowed); return; }
    const newImages: string[] = [];
    for (const file of imageFiles) newImages.push(await fileToBase64(file));
    setImages(prev => [...prev, ...newImages]);
    setError(null);
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const removeImage = (index: number) => setImages(prev => prev.filter((_, i) => i !== index));

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
        await transcribeAudio(new Blob(audioChunksRef.current, { type: 'audio/webm' }));
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      setError(null);
      recordingIntervalRef.current = setInterval(() => setRecordingTime(p => p + 1), 1000);
    } catch {
      setError('Не удалось получить доступ к микрофону. Проверьте разрешения.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      setStep('processing');
      const reader = new FileReader();
      reader.onloadend = async () => {
        const response = await fetch('/api/admin/orders/ai-transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audio: reader.result }),
        });
        const data = await response.json();
        if (data.success && data.text) {
          setTextInput(prev => prev + (prev ? '\n\n' : '') + data.text);
          setStep('input');
        } else {
          throw new Error(data.error || t.transcriptionFailed);
        }
      };
      reader.readAsDataURL(audioBlob);
    } catch {
      setError(t.failedToTranscribeAudio);
      setStep('input');
    }
  };

  const handleProcess = async () => {
    let finalText: string | undefined;
    let finalImages: string[] | undefined;

    if (inputMode === 'whatsapp') {
      if (waFiltered.length === 0) {
        setError('Нет сообщений для выбранного периода. Загрузите файл чата и выберите дату.');
        return;
      }
      finalText = formatMessagesForAI(waFiltered);
      if (!finalText.trim()) {
        setError('В выбранном периоде нет текстовых сообщений (только медиафайлы).');
        return;
      }
    } else {
      if (!textInput.trim() && images.length === 0) {
        setError('Пожалуйста, предоставьте текст, изображения или голосовой ввод');
        return;
      }
      finalText = textInput.trim() || undefined;
      finalImages = images.length > 0 ? images : undefined;
    }

    setStep('processing');
    setError(null);

    try {
      const response = await fetch('/api/admin/orders/ai-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: finalText,
          images: finalImages,
          context: {
            defaultCountry: 'Switzerland',
            currentDate: new Date().toISOString().split('T')[0],
          },
        }),
      });

      const data: AIOrderProcessingResponse = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || t.failedToExtractOrderData);
      if (data.data) { onOrderExtracted(data.data); onClose(); }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.failedToProcessOrder);
      setStep('error');
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg sm:text-2xl font-heading font-bold">AI Ассистент заказов</h2>
              <p className="text-xs sm:text-sm text-white/80 hidden sm:block">Загрузите скриншоты, чат или говорите для создания заказа</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white/20 rounded-full p-2 transition-colors shrink-0">
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {step === 'input' && (
            <div className="space-y-4 sm:space-y-6">

              {/* Mode tabs */}
              <div className="flex gap-1.5 bg-cream-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => { setInputMode('standard'); setError(null); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 sm:px-4 rounded-lg font-semibold text-xs sm:text-sm transition-all ${
                    inputMode === 'standard' ? 'bg-white text-purple-700 shadow-sm' : 'text-charcoal-600 hover:text-charcoal-900'
                  }`}
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="hidden xs:inline">Фото / Текст / Голос</span>
                  <span className="xs:hidden">Стандарт</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setInputMode('whatsapp'); setError(null); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 sm:px-4 rounded-lg font-semibold text-xs sm:text-sm transition-all ${
                    inputMode === 'whatsapp' ? 'bg-white text-green-700 shadow-sm' : 'text-charcoal-600 hover:text-charcoal-900'
                  }`}
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  WhatsApp
                </button>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3 sm:p-4 flex items-start gap-2 sm:gap-3">
                  <svg className="w-5 h-5 text-red-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* ── WhatsApp mode ── */}
              {inputMode === 'whatsapp' && (
                <div className="space-y-4 sm:space-y-5">

                  {/* File upload box */}
                  <div>
                    <label className="block text-sm font-semibold text-charcoal-700 mb-2">
                      Загрузить экспорт чата WhatsApp (.txt)
                    </label>
                    <div
                      onClick={() => waChatFileRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-5 sm:p-8 text-center cursor-pointer transition-all ${
                        waChat ? 'border-green-400 bg-green-50' : 'border-green-300 hover:border-green-400 hover:bg-green-50/50'
                      }`}
                    >
                      {waChat ? (
                        <>
                          <svg className="w-9 h-9 mx-auto text-green-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="font-semibold text-green-800 text-sm truncate px-4">{waFileName}</p>
                          <p className="text-xs text-green-600 mt-1">{waParsed.length} сообщений · {waDateRange.minISO} → {waDateRange.maxISO}</p>
                          <p className="text-xs text-charcoal-400 mt-1">Нажмите для замены</p>
                        </>
                      ) : (
                        <>
                          <svg className="w-9 h-9 mx-auto text-green-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <p className="font-semibold text-charcoal-800 text-sm">Нажмите для загрузки экспорта чата</p>
                          <p className="text-xs text-charcoal-500 mt-1">WhatsApp → чат → ⋮ → Ещё → Экспорт чата → Без медиафайлов</p>
                        </>
                      )}
                    </div>
                    <input
                      ref={waChatFileRef}
                      type="file"
                      accept=".txt,text/plain"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setWaFileName(file.name);
                        setWaFromDate(undefined);
                        const reader = new FileReader();
                        reader.onload = ev => setWaChat(ev.target?.result as string ?? '');
                        reader.readAsText(file, 'utf-8');
                        e.target.value = '';
                      }}
                    />
                  </div>

                  {/* Date picker — shown after file loaded */}
                  {waParsed.length > 0 && (
                    <div>
                      <p className="text-xs text-charcoal-500 mb-3">
                        Все сообщения до выбранной даты будут проигнорированы. Оставьте пустым, чтобы отправить весь чат.
                      </p>
                      <DatePicker
                        selectedDate={waFromDate}
                        onDateChange={setWaFromDate}
                        locale="ru"
                        minDate={waDateRange.minDate}
                        label="Включить сообщения с даты"
                        placeholder="Весь чат (без фильтра)"
                        showHelperText={false}
                      />
                    </div>
                  )}

                  {/* Preview */}
                  {waFiltered.length > 0 && (
                    <div className="bg-green-50 border-2 border-green-200 rounded-xl p-3 sm:p-4">
                      <p className="text-sm font-semibold text-green-800 mb-2">
                        {waFiltered.length} сообщений будет отправлено ИИ
                        {waFromDate && (
                          <span className="font-normal text-green-700"> (с {dateToISO(waFromDate)})</span>
                        )}
                      </p>
                      <div className="max-h-36 overflow-y-auto font-mono text-xs text-green-900 space-y-0.5">
                        {waFiltered.slice(0, 25).map((msg, i) => (
                          <div key={i} className="truncate">
                            <span className="text-green-600">[{msg.dateISO} {msg.time}]</span>{' '}
                            <span className="font-semibold">{msg.sender}:</span>{' '}
                            {msg.content.replace(/‎/g, '').substring(0, 90)}
                          </div>
                        ))}
                        {waFiltered.length > 25 && (
                          <p className="text-green-500 italic pt-1">… и ещё {waFiltered.length - 25} сообщений</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Standard mode ── */}
              {inputMode === 'standard' && (
                <>
                  {/* How it works */}
                  <div className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 rounded-2xl p-4 sm:p-5">
                    <h3 className="font-heading font-bold text-purple-900 mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Как это работает
                    </h3>
                    <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-purple-800">
                      <li className="flex items-start gap-2">
                        <span className="text-purple-600 font-bold shrink-0">1.</span>
                        <span>Загрузите скриншоты (WhatsApp, Instagram) или введите / произнесите детали заказа</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-purple-600 font-bold shrink-0">2.</span>
                        <span>ИИ извлечёт данные клиента, товары, доставку и оплату</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-purple-600 font-bold shrink-0">3.</span>
                        <span>Проверьте и при необходимости скорректируйте перед созданием заказа</span>
                      </li>
                    </ul>
                  </div>

                  {/* Screenshot upload */}
                  <div>
                    <label className="block text-sm font-semibold text-charcoal-700 mb-2 sm:mb-3">
                      Загрузить скриншоты (необязательно)
                    </label>
                    <div
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-purple-300 rounded-2xl p-6 sm:p-8 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50/50 transition-all"
                    >
                      <svg className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-purple-400 mb-2 sm:mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="font-semibold text-charcoal-800 mb-1 text-sm sm:text-base">Нажмите или перетащите файлы</p>
                      <p className="text-xs sm:text-sm text-charcoal-500">PNG, JPG до 10МБ (макс. 5 изображений)</p>
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />

                    {images.length > 0 && (
                      <div className="mt-3 sm:mt-4 grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
                        {images.map((image, index) => (
                          <div key={index} className="relative group">
                            <img src={image} alt={`Фото ${index + 1}`} className="w-full h-20 sm:h-24 object-cover rounded-lg border-2 border-cream-300" />
                            <button
                              onClick={e => { e.stopPropagation(); removeImage(index); }}
                              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex-1 h-px bg-cream-300" />
                    <span className="text-xs font-semibold text-charcoal-500 uppercase tracking-wide">или</span>
                    <div className="flex-1 h-px bg-cream-300" />
                  </div>

                  {/* Voice recording */}
                  <div>
                    <label className="block text-sm font-semibold text-charcoal-700 mb-2 sm:mb-3">
                      {t.voiceInputOptional}
                    </label>
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-2xl p-4 sm:p-6">
                      {!isRecording ? (
                        <div className="text-center">
                          <button
                            onClick={startRecording}
                            className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-full flex items-center justify-center mx-auto mb-3 transition-all transform hover:scale-105 shadow-lg"
                          >
                            <svg className="w-7 h-7 sm:w-8 sm:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                          </button>
                          <p className="font-semibold text-charcoal-800 mb-1 text-sm sm:text-base">Нажмите для записи</p>
                          <p className="text-xs sm:text-sm text-charcoal-600">Чётко произнесите детали заказа</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse">
                            <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <circle cx="12" cy="12" r="6" />
                            </svg>
                          </div>
                          <p className="font-bold text-red-600 text-xl mb-2">{formatTime(recordingTime)}</p>
                          <p className="text-sm text-charcoal-600 mb-4">Запись...</p>
                          <button onClick={stopRecording} className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-colors text-sm">
                            Остановить запись
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex-1 h-px bg-cream-300" />
                    <span className="text-xs font-semibold text-charcoal-500 uppercase tracking-wide">или</span>
                    <div className="flex-1 h-px bg-cream-300" />
                  </div>

                  {/* Text input */}
                  <div>
                    <label className="block text-sm font-semibold text-charcoal-700 mb-2 sm:mb-3">
                      {t.typeOrderDetailsOptional}
                    </label>
                    <textarea
                      value={textInput}
                      onChange={e => setTextInput(e.target.value)}
                      placeholder={"Вставьте переписку или введите детали заказа...\n\nПример:\nКлиент: Мария Росси\nТелефон: +41 79 123 4567\nЗаказ: Шоколадный торт, 2 кг, надпись «С Днём Рождения»\nДоставка: завтра в 15:00, самовывоз\nОплата: Twint, оплачено"}
                      rows={6}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border-2 border-cream-300 focus:border-purple-500 focus:outline-none font-mono text-xs sm:text-sm"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {step === 'processing' && (
            <div className="flex flex-col items-center justify-center py-12 sm:py-16">
              <div className="w-16 h-16 sm:w-20 sm:h-20 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-5 sm:mb-6" />
              <h3 className="text-xl sm:text-2xl font-heading font-bold text-charcoal-900 mb-2">Обработка с ИИ...</h3>
              <p className="text-sm sm:text-base text-charcoal-600 text-center max-w-md px-4">
                Анализирую данные и извлекаю информацию о заказе. Форма будет заполнена автоматически.
              </p>
            </div>
          )}

          {step === 'error' && (
            <div className="flex flex-col items-center justify-center py-12 sm:py-16">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-100 rounded-full flex items-center justify-center mb-5 sm:mb-6">
                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl sm:text-2xl font-heading font-bold text-charcoal-900 mb-2">Ошибка обработки</h3>
              <p className="text-sm sm:text-base text-charcoal-600 text-center max-w-md px-4 mb-6">{error}</p>
              <button onClick={() => setStep('input')} className="px-6 py-3 bg-brown-500 text-white rounded-xl font-semibold hover:bg-brown-600 transition-colors text-sm sm:text-base">
                Попробовать снова
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-cream-50 border-t-2 border-cream-200 px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center shrink-0">
          <button
            onClick={onClose}
            className="px-4 sm:px-5 py-2 sm:py-2.5 bg-white text-charcoal-700 rounded-xl font-semibold hover:bg-cream-100 transition-colors border-2 border-cream-300 text-sm sm:text-base"
          >
            Отмена
          </button>

          {step === 'input' && (() => {
            const isDisabled = inputMode === 'whatsapp' ? waFiltered.length === 0 : !textInput.trim() && images.length === 0;
            const isWa = inputMode === 'whatsapp';
            return (
              <button
                onClick={handleProcess}
                disabled={isDisabled}
                className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2 text-sm sm:text-base ${
                  isDisabled
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : isWa
                      ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg'
                      : 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg'
                }`}
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {isWa
                  ? (waFiltered.length > 0 ? `Обработать ${waFiltered.length} сообщ.` : 'Обработать чат')
                  : 'Обработать с ИИ'}
              </button>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
