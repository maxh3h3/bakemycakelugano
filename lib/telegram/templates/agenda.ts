// Telegram templates for the daily agenda digest (08:00) and the
// "~1 hour prior" reminders. Italian copy + HTML to match the rest of
// the bot (see order-notification.ts).
import { formatDeliveryAddress, type DeliveryAddress } from '@/lib/schemas/delivery';

const icons = {
  agenda: '🗓️',
  meeting: '🤝',
  delivery: '🚚',
  pickup: '🏪',
  clock: '⏰',
  customer: '👤',
  phone: '📞',
  pin: '📍',
  empty: '🌤️',
};

export interface AgendaMeeting {
  meeting_time: string;
  client_name: string | null;
  client_phone: string | null;
}

export interface AgendaDelivery {
  order_number: string;
  customer_name: string;
  delivery_type: string | null;
  delivery_time: string | null;
  delivery_address: DeliveryAddress | null;
}

/** Format a YYYY-MM-DD date as a long Italian date. */
function formatLongDate(dateString: string): string {
  // Append T00:00 so it's parsed as local, not shifted by UTC.
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

/**
 * Daily 08:00 digest: everything happening today, in one message.
 */
export function generateDailyDigestMessage(
  dateString: string,
  meetings: AgendaMeeting[],
  deliveries: AgendaDelivery[]
): string {
  let message = `${icons.agenda} <b>AGENDA DI OGGI</b>\n`;
  message += `${formatLongDate(dateString)}\n\n`;

  // Meetings section
  message += `${icons.meeting} <b>Incontri (${meetings.length})</b>\n`;
  if (meetings.length === 0) {
    message += `<i>Nessun incontro</i>\n`;
  } else {
    for (const m of meetings) {
      const who = m.client_name || 'Incontro interno';
      message += `• <b>${m.meeting_time}</b> — ${who}`;
      if (m.client_phone) message += ` (${m.client_phone})`;
      message += '\n';
    }
  }
  message += '\n';

  // Split into pickups (delivery_type === 'pickup') and deliveries
  // (everything else), so both are clearly visible as separate sections.
  const pickups = deliveries.filter((d) => d.delivery_type === 'pickup');
  const dropoffs = deliveries.filter((d) => d.delivery_type !== 'pickup');

  const formatLine = (icon: string, d: AgendaDelivery) => {
    const time = d.delivery_time ? `<b>${d.delivery_time}</b>` : '<i>orario n/d</i>';
    return `${icon} ${time} — #${d.order_number} ${d.customer_name}\n`;
  };

  // Pickups section
  message += `${icons.pickup} <b>Ritiri (${pickups.length})</b>\n`;
  if (pickups.length === 0) {
    message += `<i>Nessun ritiro</i>\n`;
  } else {
    for (const d of pickups) message += formatLine(icons.pickup, d);
  }
  message += '\n';

  // Deliveries section
  message += `${icons.delivery} <b>Consegne (${dropoffs.length})</b>\n`;
  if (dropoffs.length === 0) {
    message += `<i>Nessuna consegna</i>\n`;
  } else {
    for (const d of dropoffs) message += formatLine(icons.delivery, d);
  }

  if (meetings.length === 0 && deliveries.length === 0) {
    message += `\n${icons.empty} <i>Giornata libera!</i>`;
  }

  return message;
}

/**
 * Reminder for a meeting starting soon.
 */
export function generateMeetingReminderMessage(m: AgendaMeeting): string {
  const who = m.client_name || 'Incontro interno';
  let message = `${icons.clock} <b>PROMEMORIA — Incontro tra ~1 ora</b>\n\n`;
  message += `${icons.meeting} <b>${m.meeting_time}</b> — ${who}\n`;
  if (m.client_phone) message += `${icons.phone} ${m.client_phone}\n`;
  return message;
}

/**
 * Reminder for a delivery/pickup happening soon.
 */
export function generateDeliveryReminderMessage(d: AgendaDelivery): string {
  const isPickup = d.delivery_type === 'pickup';
  const label = isPickup ? 'Ritiro' : 'Consegna';
  let message = `${icons.clock} <b>PROMEMORIA — ${label} tra ~1 ora</b>\n\n`;
  message += `${isPickup ? icons.pickup : icons.delivery} <b>${d.delivery_time || 'orario n/d'}</b> — #${d.order_number}\n`;
  message += `${icons.customer} ${d.customer_name}\n`;
  if (!isPickup && d.delivery_address) {
    message += `${icons.pin} ${formatDeliveryAddress(d.delivery_address)}\n`;
  }
  return message;
}
