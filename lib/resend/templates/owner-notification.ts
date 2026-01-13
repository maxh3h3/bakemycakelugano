import { formatPrice, parseDateFromDB } from '@/lib/utils';
import { formatDeliveryAddress, type DeliveryAddress } from '@/lib/schemas/delivery';

interface OrderItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  size_label?: string | null;
  flavour_name?: string | null;
}

interface OwnerNotificationEmailProps {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  orderItems: OrderItem[];
  totalAmount: number;
  deliveryType: string;
  deliveryDate?: string | null;
  deliveryTime?: string | null;
  deliveryAddress?: DeliveryAddress | null;
  specialInstructions?: string | null;
}

export function generateOwnerNotificationEmail({
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
}: OwnerNotificationEmailProps): { subject: string; html: string } {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🔔 Nuovo Ordine Ricevuto</title>
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
      max-width: 700px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 26px;
      font-weight: 700;
    }
    .alert-badge {
      display: inline-block;
      background-color: rgba(255, 255, 255, 0.2);
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      margin-top: 10px;
    }
    .content {
      padding: 30px;
    }
    .order-header {
      background-color: #f0fdf4;
      border-left: 4px solid #22c55e;
      padding: 20px;
      margin-bottom: 30px;
      border-radius: 8px;
    }
    .order-number {
      font-size: 24px;
      font-weight: 700;
      color: #16a34a;
      font-family: monospace;
    }
    .order-time {
      font-size: 14px;
      color: #666;
      margin-top: 5px;
    }
    .section {
      margin-bottom: 30px;
      background-color: #f9fafb;
      padding: 20px;
      border-radius: 8px;
    }
    .section-title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 15px;
      color: #16a34a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .info-grid {
      display: grid;
      gap: 12px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
    }
    .info-label {
      font-weight: 600;
      color: #666;
    }
    .info-value {
      color: #2d2d2d;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      background-color: white;
      border-radius: 8px;
      overflow: hidden;
    }
    .items-table th {
      background-color: #16a34a;
      color: white;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      font-size: 14px;
    }
    .items-table td {
      padding: 15px 12px;
      border-bottom: 1px solid #f3f4f6;
    }
    .items-table tr:last-child td {
      border-bottom: none;
    }
    .item-name {
      font-weight: 600;
      color: #2d2d2d;
    }
    .item-meta {
      font-size: 13px;
      color: #666;
      margin-top: 4px;
    }
    .delivery-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 600;
    }
    .badge-pickup {
      background-color: #dbeafe;
      color: #1e40af;
    }
    .badge-delivery {
      background-color: #fef3c7;
      color: #92400e;
    }
    .total-box {
      background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
      color: white;
      padding: 25px;
      border-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 22px;
      font-weight: 700;
      margin-top: 20px;
    }
    .special-note {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      border-radius: 8px;
      margin-top: 15px;
    }
    .special-note-title {
      font-weight: 600;
      color: #92400e;
      margin-bottom: 8px;
    }
    .special-note-text {
      color: #78350f;
    }
    .footer {
      background-color: #f9fafb;
      padding: 20px 30px;
      text-align: center;
      color: #666;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>🔔 Nuovo Ordine Ricevuto!</h1>
      <div class="alert-badge">⚡ Azione Richiesta</div>
    </div>

    <!-- Content -->
    <div class="content">
      <!-- Order Header -->
      <div class="order-header">
        <div style="font-size: 14px; color: #666; margin-bottom: 5px;">ORDINE</div>
        <div class="order-number">#${orderNumber}</div>
        <div class="order-time">📅 ${new Date().toLocaleString('it-IT', { 
          dateStyle: 'full', 
          timeStyle: 'short' 
        })}</div>
      </div>

      <!-- Customer Information -->
      <div class="section">
        <div class="section-title">👤 Informazioni Cliente</div>
        <div class="info-grid">
          <div class="info-row">
            <span class="info-label">Nome:</span>
            <span class="info-value"><strong>${customerName}</strong></span>
          </div>
          <div class="info-row">
            <span class="info-label">Email:</span>
            <span class="info-value"><a href="mailto:${customerEmail}" style="color: #16a34a; text-decoration: none;">${customerEmail}</a></span>
          </div>
          ${customerPhone ? `
            <div class="info-row">
              <span class="info-label">Telefono:</span>
              <span class="info-value"><a href="tel:${customerPhone}" style="color: #16a34a; text-decoration: none;">${customerPhone}</a></span>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Delivery Information -->
      <div class="section">
        <div class="section-title">🚚 Consegna</div>
        ${deliveryType === 'pickup' ? `
          <span class="delivery-badge badge-pickup">🏪 RITIRO IN NEGOZIO</span>
        ` : `
          <span class="delivery-badge badge-delivery">🚚 CONSEGNA A DOMICILIO</span>
          <div class="info-grid" style="margin-top: 15px;">
            ${deliveryAddress ? `
              <div class="info-row">
                <span class="info-label">Indirizzo:</span>
                <span class="info-value">${formatDeliveryAddress(deliveryAddress)}</span>
              </div>
            ` : ''}
          </div>
        `}
        ${deliveryDate ? `
          <div style="background-color: #fef2f2; border: 2px solid #dc2626; padding: 16px; border-radius: 8px; margin-top: 15px;">
            <div style="color: #dc2626; font-weight: 700; font-size: 16px; margin-bottom: 4px;">
              📅 DATA DI CONSEGNA/RITIRO
            </div>
            <div style="color: #991b1b; font-size: 18px; font-weight: 600;">
              ${parseDateFromDB(deliveryDate).toLocaleDateString('it-IT', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}${deliveryTime ? ` at ${deliveryTime}` : ''}
            </div>
          </div>
        ` : ''}
      </div>

      <!-- Order Items -->
      <div class="section">
        <div class="section-title">🎂 Prodotti Ordinati</div>
        <table class="items-table">
          <thead>
            <tr>
              <th>Qtà</th>
              <th>Prodotto</th>
              <th style="text-align: right;">Subtotale</th>
            </tr>
          </thead>
          <tbody>
            ${orderItems.map(item => `
              <tr>
                <td style="font-weight: 700; font-size: 18px;">${item.quantity}×</td>
                <td>
                  <div class="item-name">${item.product_name}</div>
                  ${item.size_label ? `<div class="item-meta">📏 Dimensione: ${item.size_label}</div>` : ''}
                  ${item.flavour_name ? `<div class="item-meta">🍰 Gusto: ${item.flavour_name}</div>` : ''}
                </td>
                <td style="text-align: right; font-weight: 600; font-size: 16px;">
                  ${formatPrice(item.subtotal)}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Total -->
        <div class="total-box">
          <span>TOTALE ORDINE</span>
          <span>${formatPrice(totalAmount)}</span>
        </div>
      </div>

      <!-- Special Instructions -->
      ${specialInstructions ? `
        <div class="special-note">
          <div class="special-note-title">⚠️ Note Speciali dal Cliente:</div>
          <div class="special-note-text">${specialInstructions}</div>
        </div>
      ` : ''}
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>✅ Questo ordine è stato pagato con successo tramite Stripe</p>
      <p style="margin-top: 10px;">
        <strong>Azione richiesta:</strong> Controlla le date di consegna e inizia la preparazione
      </p>
    </div>
  </div>
</body>
</html>
  `;

  return {
    subject: `🔔 Nuovo Ordine #${orderNumber} - ${customerName}`,
    html,
  };
}

