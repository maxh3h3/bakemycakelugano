// Shapes shared by the email API routes and the admin email UI.

export type EmailDirection = 'inbound' | 'outbound';

export interface EmailThreadSummary {
  contact: string;
  name: string | null;          // client name when the address is a known client
  latestSubject: string;
  latestDate: string;
  latestDirection: EmailDirection;
  awaitingReply: boolean;       // the customer wrote last
  preview: string;
  count: number;
  linkedOrderId: string | null;
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

export interface EmailThreadOrder {
  id: string;
  order_number: string;
  delivery_date: string | null;
  total_amount: number | null;
  paid: boolean | null;
}

export interface EmailThreadDetail {
  emails: EmailMessage[];
  order: EmailThreadOrder | null;
  contact: string;
  name: string | null;
}

export interface OutgoingAttachment {
  filename: string;
  contentType: string;
  base64: string;
}
