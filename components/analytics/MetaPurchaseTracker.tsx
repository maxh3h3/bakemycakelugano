'use client';

import { useEffect } from 'react';
import { trackPurchase } from '@/lib/meta-pixel';

interface MetaPurchaseTrackerProps {
  sessionId: string;
  value: number;
  contents: Array<{ id: string; quantity: number; item_price: number }>;
  numItems: number;
}

/**
 * Fires the browser-side Meta Purchase event once per order on the
 * checkout success page. The localStorage flag prevents re-firing on
 * refresh; the eventID (Stripe session id) deduplicates against the
 * server-side Conversions API event.
 */
export default function MetaPurchaseTracker({
  sessionId,
  value,
  contents,
  numItems,
}: MetaPurchaseTrackerProps) {
  useEffect(() => {
    if (!sessionId || value <= 0) {
      return;
    }

    // localStorage may be unavailable (private mode); if so still fire —
    // Meta's event_id dedup is the backstop against double counting.
    const storageKey = `meta_purchase_${sessionId}`;
    let alreadyTracked = false;
    try {
      alreadyTracked = localStorage.getItem(storageKey) !== null;
    } catch {
      // ignore
    }
    if (alreadyTracked) {
      return;
    }

    trackPurchase({ contents, numItems, value }, sessionId);

    try {
      localStorage.setItem(storageKey, '1');
    } catch {
      // ignore
    }
  }, [sessionId, value, contents, numItems]);

  return null;
}
