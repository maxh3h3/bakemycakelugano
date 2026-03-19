'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const WEBHOOK_ID = 'bb9d5ed5-53a7-444c-934a-1d171046d74d';
const BASE_URL = `https://chat.botpress.cloud/${WEBHOOK_ID}`;
const STORAGE_KEY_USER_ID = 'bmk_chat_user_id';
const STORAGE_KEY_USER_KEY = 'bmk_chat_user_key';
const STORAGE_KEY_CONV_ID = 'bmk_chat_conv_id';
const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 45000;

export interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  text: string;
  createdAt: string;
}

interface BotpressSession {
  userId: string;
  userKey: string;
  convId: string;
}

async function createSession(): Promise<BotpressSession> {
  const userRes = await fetch(`${BASE_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Guest' }),
  });
  const { user, key } = await userRes.json();

  const convRes = await fetch(`${BASE_URL}/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-key': key },
    body: JSON.stringify({}),
  });
  const { conversation } = await convRes.json();

  localStorage.setItem(STORAGE_KEY_USER_ID, user.id);
  localStorage.setItem(STORAGE_KEY_USER_KEY, key);
  localStorage.setItem(STORAGE_KEY_CONV_ID, conversation.id);

  return { userId: user.id, userKey: key, convId: conversation.id };
}

async function fetchMessages(session: BotpressSession): Promise<ChatMessage[]> {
  const res = await fetch(
    `${BASE_URL}/conversations/${session.convId}/messages`,
    { headers: { 'x-user-key': session.userKey } }
  );
  const data = await res.json();
  const raw: any[] = data.messages ?? [];

  return raw
    .filter((m) => m.payload?.type === 'text' && m.payload?.text)
    .map((m) => ({
      id: m.id,
      role: m.userId === session.userId ? 'user' : 'bot',
      text: m.payload.text,
      createdAt: m.createdAt,
    }))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export function useBotpressChat(locale: string) {
  const [session, setSession] = useState<BotpressSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Init session from localStorage or create fresh
  useEffect(() => {
    const userId = localStorage.getItem(STORAGE_KEY_USER_ID);
    const userKey = localStorage.getItem(STORAGE_KEY_USER_KEY);
    const convId = localStorage.getItem(STORAGE_KEY_CONV_ID);

    const init = async () => {
      let sess: BotpressSession;
      if (userId && userKey && convId) {
        sess = { userId, userKey, convId };
      } else {
        sess = await createSession();
      }
      setSession(sess);
      const msgs = await fetchMessages(sess);
      setMessages(msgs);
      setIsReady(true);
    };

    init().catch(() => {
      // If loading old session fails (e.g. expired), create fresh
      localStorage.clear();
      createSession().then((sess) => {
        setSession(sess);
        setIsReady(true);
      });
    });
  }, []);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
    pollingRef.current = null;
    pollTimeoutRef.current = null;
  }, []);

  const startPolling = useCallback(
    (sess: BotpressSession, afterMessageId: string) => {
      stopPolling();
      setIsTyping(true);

      pollingRef.current = setInterval(async () => {
        try {
          const msgs = await fetchMessages(sess);
          const botReplies = msgs.filter(
            (m) =>
              m.role === 'bot' &&
              new Date(m.createdAt).getTime() > new Date(afterMessageId).getTime()
          );
          if (botReplies.length > 0) {
            setMessages(msgs);
            setIsTyping(false);
            stopPolling();
          }
        } catch {
          // keep polling silently
        }
      }, POLL_INTERVAL_MS);

      // Hard timeout — stop waiting after 45s
      pollTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        stopPolling();
      }, POLL_TIMEOUT_MS);
    },
    [stopPolling]
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if (!session || !text.trim()) return;

      const optimisticMsg: ChatMessage = {
        id: `local-${Date.now()}`,
        role: 'user',
        text: text.trim(),
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticMsg]);

      await fetch(`${BASE_URL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-key': session.userKey,
        },
        body: JSON.stringify({
          conversationId: session.convId,
          payload: { type: 'text', text: text.trim() },
        }),
      });

      startPolling(session, optimisticMsg.createdAt);
    },
    [session, startPolling]
  );

  // Cleanup on unmount
  useEffect(() => () => stopPolling(), [stopPolling]);

  return { messages, sendMessage, isTyping, isReady };
}
