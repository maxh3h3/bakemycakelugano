import { supabaseAdmin } from '@/lib/supabase/server';
import type { EmailOrder, EmailOrderState } from './types';

// Who is behind an email address: the client (by email) and that client's
// orders. Linked through the client at read time, so orders from the website,
// the phone or the orders page all show up without stamping emails.

export interface ContactInfo {
  name: string | null;
  orders: EmailOrder[];
}

/** Today's date in Lugano as YYYY-MM-DD (orders.delivery_date is a plain date). */
export function todayInLugano(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zurich' }).format(new Date());
}

/** Open until its date has passed; then closed when paid, otherwise done but unpaid. */
export function orderState(order: { delivery_date: string | null; paid: boolean }, today = todayInLugano()): EmailOrderState {
  if (!order.delivery_date || order.delivery_date >= today) return 'open';
  return order.paid ? 'closed' : 'unpaid';
}

const RANK: Record<EmailOrderState, number> = { open: 0, unpaid: 1, closed: 2 };

/** Open orders soonest first, then unpaid past ones, then closed, both newest first. */
function compareOrders(a: EmailOrder, b: EmailOrder): number {
  if (RANK[a.state] !== RANK[b.state]) return RANK[a.state] - RANK[b.state];
  const da = a.delivery_date ?? '9999-12-31';
  const db = b.delivery_date ?? '9999-12-31';
  return a.state === 'open' ? da.localeCompare(db) : db.localeCompare(da);
}

const ORDER_FIELDS =
  'id, client_id, order_number, delivery_date, delivery_time, delivery_type, delivery_address, total_amount, currency, paid, customer_notes';
const ITEM_FIELDS =
  'order_items ( id, product_name, quantity, subtotal, flavour_name, weight_kg, diameter_cm, writing_on_cake )';

/**
 * Client name and orders for each email address.
 * `linkedOrderIds` adds orders stamped on emails explicitly (an order created
 * from a thread), in case the client's saved email differs from the thread's.
 */
export async function contactInfo(
  contacts: string[],
  { linkedOrderIds = new Map<string, string[]>(), withItems = false } = {},
): Promise<Map<string, ContactInfo>> {
  const wanted = new Set(contacts.map(c => c.toLowerCase()));
  const result = new Map<string, ContactInfo>([...wanted].map(c => [c, { name: null, orders: [] }]));
  if (wanted.size === 0) return result;

  // clients.email is free text with mixed case and only a few hundred rows,
  // so match in memory rather than one case-insensitive query per address.
  const { data: clients, error: clientsError } = await (supabaseAdmin as any)
    .from('clients')
    .select('id, name, email')
    .not('email', 'is', null);
  if (clientsError) throw new Error(`clients lookup failed: ${clientsError.message}`);

  const contactByClient = new Map<string, string>();
  for (const c of clients ?? []) {
    const email = String(c.email).trim().toLowerCase();
    if (!wanted.has(email)) continue;
    contactByClient.set(c.id, email);
    result.get(email)!.name ??= c.name || null;
  }

  const contactByOrder = new Map<string, string>();
  for (const [contact, ids] of linkedOrderIds) for (const id of ids) contactByOrder.set(id, contact.toLowerCase());

  const select = withItems ? `${ORDER_FIELDS}, ${ITEM_FIELDS}` : ORDER_FIELDS;
  const queries = [];
  if (contactByClient.size) queries.push((supabaseAdmin as any).from('orders').select(select).in('client_id', [...contactByClient.keys()]));
  if (contactByOrder.size) queries.push((supabaseAdmin as any).from('orders').select(select).in('id', [...contactByOrder.keys()]));

  const today = todayInLugano();
  const seen = new Set<string>();
  for (const { data, error } of await Promise.all(queries)) {
    if (error) throw new Error(`orders lookup failed: ${error.message}`);
    for (const o of data ?? []) {
      const contact = contactByClient.get(o.client_id) ?? contactByOrder.get(o.id);
      if (!contact || seen.has(`${contact}:${o.id}`)) continue;
      seen.add(`${contact}:${o.id}`);
      const paid = Boolean(o.paid);
      result.get(contact)?.orders.push({
        id: o.id,
        order_number: o.order_number,
        delivery_date: o.delivery_date,
        delivery_time: o.delivery_time,
        delivery_type: o.delivery_type,
        delivery_address: o.delivery_address,
        total_amount: Number(o.total_amount) || 0,   // numeric can arrive as a string
        currency: o.currency || 'CHF',
        paid,
        customer_notes: o.customer_notes,
        state: orderState({ delivery_date: o.delivery_date, paid }, today),
        ...(withItems && {
          items: (o.order_items ?? []).map((i: any) => ({ ...i, subtotal: Number(i.subtotal) || 0 })),
        }),
      });
    }
  }

  for (const info of result.values()) info.orders.sort(compareOrders);
  return result;
}
