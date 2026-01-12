// Telegram notification template for new orders
import { formatDeliveryAddress, type DeliveryAddress } from '@/lib/schemas/delivery';

interface OrderItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  size_label?: string | null;
  flavour_name?: string | null;
}

interface OrderNotificationProps {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  orderItems: OrderItem[];
  totalAmount: number;
  deliveryType: string;
  deliveryDate?: string | null;
  deliveryTime?: string | null;
  deliveryAddress?: DeliveryAddress | null;
  specialInstructions?: string | null;
}

/**
 * Generate formatted Telegram message for new order notification
 * Uses HTML formatting supported by Telegram Bot API
 */
export function generateOrderNotificationMessage({
  orderNumber,
  customerName,
  customerEmail,
  customerPhone,
  orderItems,
  totalAmount,
  deliveryType,
  deliveryDate,
  deliveryTime,
  deliveryAddress,
  specialInstructions,
}: OrderNotificationProps): string {
  // Emoji icons for visual appeal
  const icons = {
    newOrder: '🎂',
    customer: '👤',
    email: '📧',
    phone: '📞',
    delivery: '🚚',
    pickup: '🏪',
    money: '💰',
    calendar: '📅',
    note: '📝',
    items: '🛒',
  };

  // Format delivery date if present
  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Build the message
  let message = `${icons.newOrder} <b>NUOVO ORDINE #${orderNumber}</b>\n\n`;

  // Customer information
  message += `${icons.customer} <b>Cliente:</b> ${customerName}\n`;
  message += `${icons.email} ${customerEmail}\n`;
  if (customerPhone) {
    message += `${icons.phone} ${customerPhone}\n`;
  }
  message += '\n';

  // Order items
  message += `${icons.items} <b>Prodotti:</b>\n`;
  orderItems.forEach((item, index) => {
    message += `${index + 1}. <b>${item.product_name}</b>\n`;
    message += `   Quantità: ${item.quantity}x\n`;
    if (item.size_label) {
      message += `   Dimensione: ${item.size_label}\n`;
    }
    if (item.flavour_name) {
      message += `   Gusto: ${item.flavour_name}\n`;
    }
    message += `   Prezzo: CHF ${item.unit_price.toFixed(2)}\n`;
    message += `   Subtotale: CHF ${item.subtotal.toFixed(2)}\n`;
    if (index < orderItems.length - 1) {
      message += '\n';
    }
  });
  message += '\n';

  // Total amount
  message += `${icons.money} <b>TOTALE: CHF ${totalAmount.toFixed(2)}</b>\n\n`;

  // Delivery information
  if (deliveryType === 'delivery') {
    message += `${icons.delivery} <b>Consegna a domicilio</b>\n`;
    if (deliveryAddress) {
      message += `${formatDeliveryAddress(deliveryAddress)}\n`;
    }
  } else if (deliveryType === 'pickup') {
    message += `${icons.pickup} <b>Ritiro in negozio</b>\n`;
  }
  
  // Delivery/pickup date
  if (deliveryDate) {
    const formattedDate = formatDate(deliveryDate);
    message += `\n${icons.calendar} <b>DATA: ${formattedDate}</b>`;
    if (deliveryTime) {
      message += ` at ${deliveryTime}`;
    }
    message += '\n';
  }
  message += '\n';

  // Special instructions
  if (specialInstructions && specialInstructions.trim()) {
    message += `${icons.note} <b>Note speciali:</b>\n${specialInstructions}\n\n`;
  }

  // Call to action
  message += `━━━━━━━━━━━━━━━━━━━━\n`;
  message += `✅ <b>Verifica l'ordine sul dashboard</b>`;

  return message;
}

