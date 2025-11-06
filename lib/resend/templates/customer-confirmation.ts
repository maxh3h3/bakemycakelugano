import { formatPrice } from '@/lib/utils';

interface OrderItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  size_label?: string | null;
  flavour_name?: string | null;
  delivery_date?: string | null;
}

interface CustomerConfirmationEmailProps {
  customerName: string;
  orderNumber: string;
  orderItems: OrderItem[];
  totalAmount: number;
  deliveryType: string;
  deliveryAddress?: string | null;
  deliveryCity?: string | null;
  deliveryPostalCode?: string | null;
  deliveryCountry?: string | null;
  deliveryFee?: number;
  deliveryRequiresContact?: boolean;
  specialInstructions?: string | null;
  locale: string;
}

const translations = {
  it: {
    subject: '🎂 Ordine Confermato',
    title: 'Grazie per il tuo ordine!',
    greeting: 'Ciao',
    intro: 'Abbiamo ricevuto il tuo ordine e inizieremo a prepararlo a breve.',
    orderNumber: 'Numero Ordine',
    orderDetails: 'Dettagli Ordine',
    quantity: 'Quantità',
    product: 'Prodotto',
    price: 'Prezzo',
    deliveryInfo: 'Informazioni Consegna',
    pickup: 'Ritiro in negozio',
    delivery: 'Consegna a domicilio',
    deliveryFee: 'Costo di consegna',
    deliveryOutsideArea: '⚠️ Il tuo indirizzo è fuori dall\'area di consegna standard di Lugano. Ti contatteremo presto per confermare la disponibilità e i costi di consegna.',
    subtotal: 'Subtotale',
    size: 'Dimensione',
    flavour: 'Gusto',
    deliveryDate: 'Data di consegna',
    specialInstructions: 'Istruzioni Speciali',
    total: 'Totale',
    footer: 'Se hai domande sul tuo ordine, non esitare a contattarci.',
    thanks: 'Grazie per aver scelto Bake My Cake!',
  },
  en: {
    subject: '🎂 Order Confirmed',
    title: 'Thank you for your order!',
    greeting: 'Hello',
    intro: 'We have received your order and will start preparing it shortly.',
    orderNumber: 'Order Number',
    orderDetails: 'Order Details',
    quantity: 'Quantity',
    product: 'Product',
    price: 'Price',
    deliveryInfo: 'Delivery Information',
    pickup: 'Store Pickup',
    delivery: 'Home Delivery',
    deliveryFee: 'Delivery Fee',
    deliveryOutsideArea: '⚠️ Your address is outside the standard Lugano delivery area. We will contact you soon to confirm delivery availability and costs.',
    subtotal: 'Subtotal',
    size: 'Size',
    flavour: 'Flavour',
    deliveryDate: 'Delivery date',
    specialInstructions: 'Special Instructions',
    total: 'Total',
    footer: 'If you have any questions about your order, please don\'t hesitate to contact us.',
    thanks: 'Thank you for choosing Bake My Cake!',
  },
};

export function generateCustomerConfirmationEmail({
  customerName,
  orderNumber,
  orderItems,
  totalAmount,
  deliveryType,
  deliveryAddress,
  deliveryCity,
  deliveryPostalCode,
  deliveryCountry,
  deliveryFee = 0,
  deliveryRequiresContact = false,
  specialInstructions,
  locale,
}: CustomerConfirmationEmailProps): { subject: string; html: string } {
  const t = translations[locale as keyof typeof translations] || translations.it;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.subject}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #2d2d2d;
      background-color: #faf9f7;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #8b6f47 0%, #a0826d 100%);
      color: white;
      padding: 40px 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 18px;
      margin-bottom: 20px;
    }
    .intro {
      color: #666;
      margin-bottom: 30px;
    }
    .order-number {
      background-color: #f5f3f0;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
      text-align: center;
    }
    .order-number-label {
      font-size: 14px;
      color: #666;
      margin-bottom: 8px;
    }
    .order-number-value {
      font-size: 24px;
      font-weight: 700;
      color: #8b6f47;
      font-family: monospace;
    }
    .section {
      margin-bottom: 30px;
    }
    .section-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 15px;
      color: #2d2d2d;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .items-table th {
      background-color: #f5f3f0;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      font-size: 14px;
      color: #666;
    }
    .items-table td {
      padding: 15px 12px;
      border-bottom: 1px solid #f5f3f0;
    }
    .item-name {
      font-weight: 500;
    }
    .item-meta {
      font-size: 13px;
      color: #666;
      margin-top: 4px;
    }
    .delivery-info {
      background-color: #f5f3f0;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .delivery-info p {
      margin: 8px 0;
    }
    .total {
      background-color: #8b6f47;
      color: white;
      padding: 20px;
      border-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 20px;
      font-weight: 700;
    }
    .footer {
      background-color: #f5f3f0;
      padding: 30px;
      text-align: center;
      color: #666;
      font-size: 14px;
    }
    .footer p {
      margin: 10px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>🎂 ${t.title}</h1>
    </div>

    <!-- Content -->
    <div class="content">
      <div class="greeting">
        ${t.greeting} ${customerName},
      </div>
      <p class="intro">${t.intro}</p>

      <!-- Order Number -->
      <div class="order-number">
        <div class="order-number-label">${t.orderNumber}</div>
        <div class="order-number-value">#${orderNumber}</div>
      </div>

      <!-- Order Items -->
      <div class="section">
        <div class="section-title">${t.orderDetails}</div>
        <table class="items-table">
          <thead>
            <tr>
              <th>${t.quantity}</th>
              <th>${t.product}</th>
              <th style="text-align: right;">${t.price}</th>
            </tr>
          </thead>
          <tbody>
            ${orderItems.map(item => `
              <tr>
                <td>${item.quantity}×</td>
                <td>
                  <div class="item-name">${item.product_name}</div>
                  ${item.size_label ? `<div class="item-meta">📏 ${t.size}: ${item.size_label}</div>` : ''}
                  ${item.flavour_name ? `<div class="item-meta">🍰 ${t.flavour}: ${item.flavour_name}</div>` : ''}
                  ${item.delivery_date ? `<div class="item-meta">📅 ${t.deliveryDate}: ${new Date(item.delivery_date).toLocaleDateString()}</div>` : ''}
                </td>
                <td style="text-align: right; font-weight: 500;">
                  ${formatPrice(item.subtotal)}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- Delivery Information -->
      <div class="section">
        <div class="section-title">${t.deliveryInfo}</div>
        <div class="delivery-info">
          ${deliveryType === 'pickup' ? `
            <p><strong>🏪 ${t.pickup}</strong></p>
          ` : `
            <p><strong>🚚 ${t.delivery}</strong></p>
            ${deliveryAddress ? `<p>${deliveryAddress}</p>` : ''}
            ${deliveryPostalCode && deliveryCity ? `<p>${deliveryPostalCode} ${deliveryCity}</p>` : ''}
            ${deliveryCountry ? `<p>${deliveryCountry}</p>` : ''}
            ${deliveryFee > 0 ? `<p style="margin-top: 12px;"><strong>${t.deliveryFee}:</strong> ${formatPrice(deliveryFee)}</p>` : ''}
          `}
        </div>
        ${deliveryRequiresContact ? `
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 8px; margin-top: 15px;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">
              ${t.deliveryOutsideArea}
            </p>
          </div>
        ` : ''}
      </div>

      ${specialInstructions ? `
        <div class="section">
          <div class="section-title">${t.specialInstructions}</div>
          <div class="delivery-info">
            <p>${specialInstructions}</p>
          </div>
        </div>
      ` : ''}

      <!-- Total -->
      ${deliveryFee > 0 ? `
        <div style="background-color: #f5f3f0; padding: 16px 20px; border-radius: 8px; margin-bottom: 15px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
            <span style="color: #666;">${t.subtotal}</span>
            <span style="font-weight: 500;">${formatPrice(totalAmount - deliveryFee)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding-bottom: 12px; border-bottom: 1px solid #ddd;">
            <span style="color: #666;">${t.deliveryFee}</span>
            <span style="font-weight: 500;">${formatPrice(deliveryFee)}</span>
          </div>
        </div>
      ` : ''}
      <div class="total">
        <span>${t.total}</span>
        <span>${formatPrice(totalAmount)}</span>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>${t.footer}</p>
      <p><strong>${t.thanks}</strong></p>
      <p style="margin-top: 20px; color: #999; font-size: 12px;">
        Bake My Cake 🎂
      </p>
    </div>
  </div>
</body>
</html>
  `;

  return {
    subject: t.subject,
    html,
  };
}

