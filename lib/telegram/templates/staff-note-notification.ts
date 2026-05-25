interface StaffNoteNotificationProps {
  orderNumber: string;
  deliveryDate: string | null;
  deliveryType: string | null;
  productName: string;
  quantity: number;
  weightKg?: string | null;
  flavourName?: string | null;
  writingOnCake?: string | null;
  note: string;
}

export function generateStaffNoteMessage({
  orderNumber,
  deliveryDate,
  deliveryType,
  productName,
  quantity,
  weightKg,
  flavourName,
  writingOnCake,
  note,
}: StaffNoteNotificationProps): string {
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'не указана';
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('ru-RU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const deliveryLabel =
    deliveryType === 'delivery' ? '🚚 Доставка' :
    deliveryType === 'pickup'   ? '🏪 Самовывоз' :
    '📦 Доставка';

  let message = `✍️ <b>Заметка сотрудника — Заказ #${orderNumber}</b>\n\n`;

  message += `📝 <b>Заметка:</b>\n${note}\n\n`;

  message += `━━━━━━━━━━━━━━━━━━━━\n`;
  message += `🎂 <b>${quantity}x ${productName}</b>\n`;
  if (weightKg) message += `⚖️ Вес: ${weightKg} кг\n`;
  if (flavourName) message += `🍰 Вкус: ${flavourName}\n`;
  if (writingOnCake) message += `✏️ Надпись: ${writingOnCake}\n`;
  message += `\n`;

  message += `${deliveryLabel}\n`;
  message += `📅 <b>${formatDate(deliveryDate)}</b>\n`;

  return message;
}
