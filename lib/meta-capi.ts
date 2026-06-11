/**
 * Meta Conversions API (server-side) sender.
 * Docs: https://developers.facebook.com/docs/marketing-api/conversions-api
 *
 * Sends the Purchase event from the Stripe webhook so conversions are
 * recorded even when the browser pixel is blocked or the redirect is lost.
 * Deduplicated against the browser pixel event via a shared event_id
 * (the Stripe Checkout Session id).
 */

import { createHash } from 'node:crypto';

import { META_PIXEL_ID } from './meta-pixel';

const CAPI_ENDPOINT = `https://graph.facebook.com/v21.0/${META_PIXEL_ID}/events`;

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function hashEmail(email?: string | null): string | undefined {
  const normalized = email?.trim().toLowerCase();
  return normalized ? sha256(normalized) : undefined;
}

/**
 * Meta expects phone numbers as digits only with country code.
 * Swiss numbers entered as 079 123 45 67 become 41791234567.
 */
function hashPhone(phone?: string | null): string | undefined {
  if (!phone) return undefined;
  let digits = phone.replace(/\D/g, '');
  if (!digits) return undefined;
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0') && digits.length <= 10) {
    digits = `41${digits.slice(1)}`;
  }
  return sha256(digits);
}

function hashPlain(value?: string | null): string | undefined {
  const normalized = value?.trim().toLowerCase();
  return normalized ? sha256(normalized) : undefined;
}

/** Country must be hashed as the ISO 3166-1 alpha-2 code (e.g. "ch"). */
function hashCountry(country?: string | null): string | undefined {
  const normalized = country?.trim().toLowerCase();
  if (!normalized) return undefined;
  const code = normalized.length === 2 ? normalized : normalized === 'switzerland' || normalized === 'svizzera' || normalized === 'schweiz' || normalized === 'suisse' ? 'ch' : undefined;
  return code ? sha256(code) : undefined;
}

export interface CapiPurchaseParams {
  /** Stripe Checkout Session id — shared with the browser pixel for dedup */
  eventId: string;
  /** Real charged total in CHF */
  value: number;
  eventSourceUrl: string;
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  city?: string | null;
  zipCode?: string | null;
  country?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  clientIp?: string | null;
  clientUserAgent?: string | null;
  contents: Array<{ id: string; quantity: number; item_price: number }>;
}

export async function sendPurchaseEvent(
  params: CapiPurchaseParams
): Promise<{ success: boolean; error?: string }> {
  const accessToken = process.env.META_CONVERSIONS_API_ACCESS_TOKEN;
  if (!accessToken) {
    console.warn('META_CONVERSIONS_API_ACCESS_TOKEN not set — skipping CAPI Purchase event');
    return { success: false, error: 'Access token not configured' };
  }

  const userData: Record<string, unknown> = {};
  const em = hashEmail(params.email);
  const ph = hashPhone(params.phone);
  const fn = hashPlain(params.firstName);
  const ln = hashPlain(params.lastName);
  const ct = hashPlain(params.city);
  const zp = params.zipCode ? sha256(params.zipCode.replace(/\s/g, '').toLowerCase()) : undefined;
  const country = hashCountry(params.country);

  if (em) userData.em = [em];
  if (ph) userData.ph = [ph];
  if (fn) userData.fn = [fn];
  if (ln) userData.ln = [ln];
  if (ct) userData.ct = [ct];
  if (zp) userData.zp = [zp];
  if (country) userData.country = [country];
  if (params.fbp) userData.fbp = params.fbp;
  if (params.fbc) userData.fbc = params.fbc;
  if (params.clientIp) userData.client_ip_address = params.clientIp;
  if (params.clientUserAgent) userData.client_user_agent = params.clientUserAgent;

  const numItems = params.contents.reduce((sum, c) => sum + c.quantity, 0);

  const body: Record<string, unknown> = {
    data: [
      {
        event_name: 'Purchase',
        event_time: Math.floor(Date.now() / 1000),
        event_id: params.eventId,
        action_source: 'website',
        event_source_url: params.eventSourceUrl,
        user_data: userData,
        custom_data: {
          content_type: 'product',
          content_ids: params.contents.map((c) => c.id),
          contents: params.contents,
          num_items: numItems,
          value: Math.round(params.value * 100) / 100,
          currency: 'CHF',
        },
      },
    ],
  };

  if (process.env.META_TEST_EVENT_CODE) {
    body.test_event_code = process.env.META_TEST_EVENT_CODE;
  }

  try {
    const response = await fetch(`${CAPI_ENDPOINT}?access_token=${accessToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return { success: false, error: `Meta CAPI ${response.status}: ${errorBody}` };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error sending CAPI event',
    };
  }
}
