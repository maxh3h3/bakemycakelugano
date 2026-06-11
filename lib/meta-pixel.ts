/**
 * Meta Pixel client-side event helpers.
 * Standard event reference: https://developers.facebook.com/docs/meta-pixel/reference
 */

export const META_PIXEL_ID = '1011240291849184';

type FbqContent = {
  id: string;
  quantity: number;
  item_price?: number;
};

declare global {
  interface Window {
    fbq?: (
      action: 'track' | 'trackCustom' | 'init',
      eventName: string,
      params?: Record<string, unknown>,
      options?: { eventID?: string }
    ) => void;
  }
}

function fbqTrack(
  eventName: string,
  params: Record<string, unknown>,
  options?: { eventID?: string }
) {
  if (typeof window === 'undefined' || !window.fbq) {
    return;
  }
  if (options?.eventID) {
    window.fbq('track', eventName, params, options);
  } else {
    window.fbq('track', eventName, params);
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function trackViewContent(params: {
  contentId: string;
  contentName: string;
  contentCategory?: string;
  value: number;
}) {
  fbqTrack('ViewContent', {
    content_type: 'product',
    content_ids: [params.contentId],
    content_name: params.contentName,
    ...(params.contentCategory && { content_category: params.contentCategory }),
    value: round2(params.value),
    currency: 'CHF',
  });
}

export function trackAddToCart(params: {
  contentId: string;
  contentName: string;
  value: number;
  quantity: number;
}) {
  fbqTrack('AddToCart', {
    content_type: 'product',
    content_ids: [params.contentId],
    content_name: params.contentName,
    value: round2(params.value),
    currency: 'CHF',
    contents: [{ id: params.contentId, quantity: params.quantity }] satisfies FbqContent[],
  });
}

export function trackInitiateCheckout(params: {
  contentIds: string[];
  numItems: number;
  value: number;
}) {
  fbqTrack('InitiateCheckout', {
    content_type: 'product',
    content_ids: params.contentIds,
    num_items: params.numItems,
    value: round2(params.value),
    currency: 'CHF',
  });
}

export function trackPurchase(
  params: {
    contents: FbqContent[];
    numItems: number;
    value: number;
  },
  eventId: string
) {
  fbqTrack(
    'Purchase',
    {
      content_type: 'product',
      content_ids: params.contents.map((c) => c.id),
      num_items: params.numItems,
      value: round2(params.value),
      currency: 'CHF',
      contents: params.contents,
    },
    { eventID: eventId }
  );
}
