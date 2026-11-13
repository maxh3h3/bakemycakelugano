// Shapes shared by the email API routes and the admin email UI.

export type EmailDirection = 'inbound' | 'outbound';

/**
 * open:   the pickup/delivery date is today or later (or not set yet)
 * closed: the date has passed and the order is paid
 * unpaid: the date has passed but the order is not paid (done, not closed)
 */
export type EmailOrderState = 'open' | 'closed' | 'unpaid';

export interface EmailOrderItem {
  id: string;
  product_name: string;
  quantity: number;
  subtotal: number;
  flavour_name: string | null;
  weight_kg: string | null;
  diameter_cm: string | null;
  writing_on_cake: string | null;
}

/** An order of the client behind an email conversation. */
export interface EmailOrder {
  id: string;
  order_number: string | null;
  delivery_date: string | null;  // YYYY-MM-DD
  delivery_time: string | null;
  delivery_type: string | null;
  delivery_address: unknown;
  total_amount: number;
  currency: string;
  paid: boolean;
  customer_notes: string | null;
  state: EmailOrderState;
  items?: EmailOrderItem[];      // only in the thread view
}

export interface EmailThreadSummary {
  contact: string;
  name: string | null;          // client name when the address is a known client
  latestSubject: string;
  latestDate: string;
  latestDirection: EmailDirection;
  awaitingReply: boolean;       // the customer wrote last
  preview: string;
  count: number;
  order: EmailOrder | null;     // the most relevant order (open first), without items
  orderCount: number;
}

export interface EmailAttachment {
  name: string;
  contentType: string;
  size: number;
  part: string;
  uid: number;
  url: string | null;           // null until downloaded to storage
}

export interface EmailMessage {
  id: string;
  direction: EmailDirection;
  from_email: string;
  to_email: string;
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  message_id: string | null;
  email_date: string;
  order_id: string | null;
  attachments: EmailAttachment[] | null;
}

export interface EmailThreadDetail {
  emails: EmailMessage[];
  orders: EmailOrder[];          // all of the client's orders, open first, with items
  contact: string;
  name: string | null;
}

export interface OutgoingAttachment {
  filename: string;
  contentType: string;
  base64: string;
}
