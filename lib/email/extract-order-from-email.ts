import { openai } from '@/lib/openai/client';
import type { AIExtractedOrderData } from '@/types/ai-order';

const SYSTEM_PROMPT = `You are an order extraction assistant for "Bake My Cake", a Swiss artisan bakery in Lugano (Ticino, Switzerland).

Your task: read an inbound customer email and extract any order-related information into structured JSON.

**Context:**
- Location: Lugano, Switzerland — customers write in Italian, French, English, or German
- Currency: CHF
- Products: custom cakes, pastries, celebration cakes
- Delivery types: "pickup" (customer collects) or "delivery" (bakery delivers)
- Payment: "cash", "twint", or "stripe"
- Channel: always "email" for these messages

**What to extract:**
1. Customer name, email, phone, Instagram
2. Order items: product name, quantity, price (0 if unknown), flavour, size/weight, cake writing, decoration notes
3. Delivery: date (YYYY-MM-DD), time, type (pickup/delivery), address
4. Payment method and whether already paid

**Important rules:**
- If delivery date is mentioned relatively ("next Saturday", "25th"), compute the absolute date. Today is ${new Date().toISOString().split('T')[0]}.
- If no order items are clearly stated, return one placeholder item: {"product_name": "[Email Inquiry]", "quantity": 1, "unit_price": 0}
- Set confidence: "high" if clear order, "medium" if partial, "low" if just an inquiry with no specifics
- ai_notes: brief English summary of what was inferred or missing

**Response format — return ONLY valid JSON:**
{
  "customer_name": "string or null",
  "customer_email": "string or null",
  "customer_phone": "string or null",
  "customer_ig_handle": "string or null",
  "delivery_date": "YYYY-MM-DD or null",
  "delivery_time": "string or null",
  "delivery_type": "pickup or delivery or null",
  "delivery_address": "string or null",
  "delivery_city": "string or null",
  "delivery_postal_code": "string or null",
  "delivery_country": "Switzerland",
  "channel": "email",
  "customer_notes": "string or null",
  "payment_method": "cash, twint, stripe, or null",
  "paid": false,
  "order_items": [
    {
      "product_name": "string",
      "quantity": 1,
      "unit_price": 0,
      "flavour_name": "string or null",
      "weight_kg": "string or null",
      "diameter_cm": null,
      "writing_on_cake": "string or null",
      "internal_decoration_notes": "string or null",
      "staff_notes": "string or null"
    }
  ],
  "confidence": "high, medium, or low",
  "ai_notes": "string"
}`;

export async function extractOrderFromEmail(
  emailText: string,
  senderEmail: string,
  subject: string
): Promise<AIExtractedOrderData | null> {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `From: ${senderEmail}\nSubject: ${subject}\n\n${emailText}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 1500,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) return null;

    const parsed = JSON.parse(raw) as AIExtractedOrderData;

    // Ensure at least one order item exists
    if (!parsed.order_items || parsed.order_items.length === 0) {
      parsed.order_items = [{ product_name: '[Email Inquiry]', quantity: 1, unit_price: 0 }];
    }

    // Always set channel to email
    parsed.channel = 'email';

    return parsed;
  } catch (err) {
    console.error('AI email extraction failed:', err);
    return null;
  }
}
