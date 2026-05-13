'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useBotpressChat } from './useBotpressChat';
import MessageBubble from './MessageBubble';

interface ChatWidgetProps {
  locale: string;
}

function TypingIndicator() {
  return (
    <div className="flex gap-2 items-end">
      <div className="shrink-0 w-7 h-7 rounded-full overflow-hidden border border-cream-300 shadow-sm">
        <img src="/images/icons/bmk_logo.png" alt="BakeMyCake" className="w-full h-full object-cover" />
      </div>
      <div className="bg-white border border-cream-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-brown-400 block"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

const PLACEHOLDER: Record<string, string> = {
  it: 'Scrivi un messaggio…',
  en: 'Type a message…',
  ru: 'Напишите сообщение…',
};

const FAB_LABEL: Record<string, string> = {
  it: 'Chatta con noi',
  en: 'Chat with us',
  ru: 'Написать нам',
};


export default function ChatWidget({ locale }: ChatWidgetProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [hasOpened, setHasOpened] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { messages, sendMessage, isTyping, isReady } = useBotpressChat(locale);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Focus input when chat opens + lock body scroll
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
      setHasOpened(true);
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  const handleSend = useCallback(() => {
    if (!input.trim() || isTyping) return;
    sendMessage(input.trim());
    setInput('');
  }, [input, isTyping, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const lang = locale in PLACEHOLDER ? locale : 'it';

  // Hide on the cake builder page — the floating menu is already there
  if (pathname?.includes('/builder')) return null;

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end gap-3">
      {/* ── Chat panel ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="w-[calc(100vw-2rem)] sm:w-[440px] bg-cream-100 rounded-3xl shadow-2xl border border-cream-300 flex flex-col overflow-hidden"
            style={{ height: 'min(85svh, 640px)' }}
          >
            {/* Header */}
            <div className="bg-white border-b border-cream-200 px-4 py-3 flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-cream-300 shadow-sm shrink-0">
                <img
                  src="/images/icons/bmk_logo.png"
                  alt="BakeMyCake"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-heading text-charcoal-900 font-semibold text-sm leading-tight truncate">
                  BakeMyCake
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                  <span className="text-xs text-charcoal-500">
                    {lang === 'ru' ? 'Онлайн' : lang === 'en' ? 'Online' : 'Online'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-charcoal-500 hover:bg-cream-200 hover:text-charcoal-900 transition-colors duration-150 shrink-0"
                aria-label="Close chat"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scroll-smooth">
{messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}

              {isTyping && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="bg-white border-t border-cream-200 px-3 py-3 shrink-0">
              <div className="flex items-center gap-2 bg-cream-100 rounded-2xl px-3 py-1.5 border border-cream-300 focus-within:border-brown-400 transition-colors duration-150">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={PLACEHOLDER[lang]}
                  disabled={isTyping || !isReady}
                  className="flex-1 bg-transparent text-sm text-charcoal-900 placeholder:text-charcoal-500 outline-none disabled:opacity-50 py-1"
                />
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping || !isReady}
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors duration-150',
                    input.trim() && !isTyping
                      ? 'bg-brown-500 text-cream-50 hover:bg-brown-600'
                      : 'bg-cream-300 text-charcoal-500 cursor-not-allowed'
                  )}
                  aria-label="Send"
                >
                  <svg className="w-3.5 h-3.5 translate-x-px" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                  </svg>
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating action button ── */}
      <div className="relative">
        {/* Pulse ring — attention grabber when closed */}
        <AnimatePresence>
          {!isOpen && (
            <motion.span
              className="absolute inset-0 rounded-full border-2 border-brown-400 pointer-events-none"
              animate={{ scale: [1, 1.55], opacity: [0.5, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
            />
          )}
        </AnimatePresence>

        <motion.button
          onClick={() => setIsOpen((v) => !v)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.93 }}
          className={cn(
            'relative flex items-center gap-0 sm:gap-3 rounded-full shadow-2xl border-2 border-white bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brown-500 focus-visible:ring-offset-2 transition-all duration-200',
            isOpen
              ? 'w-16 h-16 sm:w-16 sm:h-16 justify-center'
              : 'w-16 h-16 sm:h-16 sm:w-auto sm:pl-2 sm:pr-6 justify-center sm:justify-start'
          )}
          aria-label={isOpen ? 'Close chat' : 'Open chat'}
        >
          <div className="w-12 h-12 shrink-0 rounded-full overflow-hidden border border-cream-200">
            <img
              src="/images/icons/bmk_logo.png"
              alt="BakeMyCake chat"
              className="w-full h-full object-cover"
            />
          </div>
          {!isOpen && (
            <span className="hidden sm:block text-sm font-semibold text-charcoal-900 whitespace-nowrap font-heading">
              {FAB_LABEL[lang]}
            </span>
          )}
        </motion.button>

        {/* Unread dot — shows when chat has been used but is closed */}
        <AnimatePresence>
          {!isOpen && hasOpened && messages.some((m) => m.role === 'bot') && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 border-2 border-white z-10"
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
