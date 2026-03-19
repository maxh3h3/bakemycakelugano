import { Conversation, Autonomous, z } from '@botpress/runtime';

// ─── Website base URL ────────────────────────────────────────────────────────
// Update this when deploying to production.
const WEBSITE_URL = process.env.WEBSITE_URL ?? 'https://7a5b-13-250-92-153.ngrok-free.app';

// ─── Tool: Fetch product catalog ─────────────────────────────────────────────
const getProducts = new Autonomous.Tool({
  name: 'getProducts',
  description:
    'Fetch the full BakeMyCake product catalog including names, prices, sizes, ' +
    'available flavours, allergens, and a product image URL. ' +
    'Always call this before discussing or suggesting any products.',
  input: z.object({
    locale: z
      .enum(['it', 'en'])
      .default('it')
      .describe('Language for product names and descriptions. Use "it" for Italian or Russian speakers, "en" for English.'),
  }),
  output: z.object({
    products: z.array(
      z.object({
        id: z.string(),
        slug: z.string(),
        name: z.string(),
        name_en: z.string(),
        name_it: z.string(),
        description: z.string().optional(),
        category: z.string(),
        price: z.number().describe('Base price in CHF'),
        minimumOrderQuantity: z.number(),
        sizes: z.array(
          z.object({
            label: z.string(),
            value: z.string(),
            totalPrice: z.number().describe('Final price for this size in CHF'),
          })
        ),
        availableFlavours: z.array(z.string()),
        allergens: z.array(z.string()),
        imageUrl: z.string().nullable(),
      })
    ),
    flavours: z.array(
      z.object({
        name: z.string(),
        slug: z.string(),
        description: z.string().optional(),
      })
    ),
  }),
  async handler({ locale }) {
    const res = await fetch(`${WEBSITE_URL}/api/bot/products?locale=${locale}`);
    if (!res.ok) throw new Error(`Catalog unavailable (${res.status})`);
    return res.json();
  },
});

// ─── Tool: Estimate delivery fee ─────────────────────────────────────────────
const getDeliveryEstimate = new Autonomous.Tool({
  name: 'getDeliveryEstimate',
  description:
    'Calculate the delivery fee for a customer address in Switzerland. ' +
    'Call this after the customer chooses delivery (not pickup) and provides their address. ' +
    'Returns the fee in CHF and whether the address requires manual contact.',
  input: z.object({
    address: z.string().describe('Street name and number, e.g. "Via Nassa 12"'),
    city: z.string().describe('City name, e.g. "Lugano"'),
    postalCode: z.string().describe('Swiss postal code, e.g. "6900"'),
  }),
  output: z.object({
    fee: z.number().describe('Delivery fee in CHF (0 if requiresContact is true)'),
    distanceKm: z.number().describe('Driving distance from bakery in km'),
    requiresContact: z
      .boolean()
      .describe('True if the address is >50km away and requires manual confirmation'),
  }),
  async handler({ address, city, postalCode }) {
    const res = await fetch(`${WEBSITE_URL}/api/delivery-estimate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, city, postalCode, country: 'Switzerland' }),
    });
    if (!res.ok) throw new Error(`Delivery estimate failed (${res.status})`);
    const data = await res.json();
    return {
      fee: data.fee ?? 0,
      distanceKm: data.distanceKm ?? 0,
      requiresContact: data.requiresContact ?? false,
    };
  },
});

// ─── Tool: Create Stripe checkout session ─────────────────────────────────────
const createCheckout = new Autonomous.Tool({
  name: 'createCheckout',
  description:
    'Generate a Stripe payment link for the customer order. ' +
    'ONLY call this after the customer has explicitly confirmed the complete order summary. ' +
    'Requires: product(s), size, flavour (if applicable), delivery or pickup date/time, ' +
    'customer full name, email, and phone number.',
  input: z.object({
    locale: z.enum(['it', 'en', 'ru']).default('it').describe('Customer language locale'),
    customerName: z.string().describe('Customer full name'),
    customerEmail: z.string().email().describe('Customer email address'),
    customerPhone: z.string().describe('Customer phone number including country code'),
    deliveryType: z.enum(['delivery', 'pickup']).describe('Whether the customer wants delivery or will pick up'),
    deliveryDate: z.string().describe('Requested date in YYYY-MM-DD format'),
    deliveryTime: z.string().describe('Requested time, e.g. "14:00"'),
    deliveryAddress: z
      .string()
      .optional()
      .describe('Full street address for delivery (required if deliveryType is delivery)'),
    deliveryCity: z.string().optional(),
    deliveryPostalCode: z.string().optional(),
    deliveryFee: z.number().default(0).describe('Delivery fee in CHF (0 for pickup)'),
    specialInstructions: z.string().optional().describe('Any special instructions, e.g. cake writing'),
    items: z.array(
      z.object({
        productId: z.string(),
        productName: z.string(),
        quantity: z.number().int().min(1),
        unitPrice: z.number().describe('Price per unit in CHF'),
        selectedFlavour: z.string().optional(),
        flavourName: z.string().optional(),
        weight_kg: z.string().optional().describe('Size label value, e.g. "1kg"'),
        productImageUrl: z.any().optional(),
      })
    ),
  }),
  output: z.object({
    paymentUrl: z.string().describe('Stripe checkout URL — send this to the customer'),
    sessionId: z.string(),
  }),
  async handler({
    locale,
    customerName,
    customerEmail,
    customerPhone,
    deliveryType,
    deliveryDate,
    deliveryTime,
    deliveryAddress,
    deliveryCity,
    deliveryPostalCode,
    deliveryFee,
    specialInstructions,
    items,
  }) {
    // Map locale to it/en for the checkout (ru falls back to it)
    const checkoutLocale = locale === 'en' ? 'en' : 'it';

    const body = {
      customerInfo: {
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
      },
      deliveryInfo: {
        type: deliveryType,
        date: deliveryDate,
        time: deliveryTime,
        address: deliveryAddress ?? '',
        city: deliveryCity ?? '',
        postalCode: deliveryPostalCode ?? '',
        country: 'Switzerland',
        fee: deliveryFee,
      },
      specialInstructions: specialInstructions ?? '',
      items,
      locale: checkoutLocale,
    };

    const res = await fetch(`${WEBSITE_URL}/api/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Checkout failed: ${err.error ?? res.status}`);
    }

    const data = await res.json();
    return {
      paymentUrl: data.sessionUrl,
      sessionId: data.sessionUrl?.split('session_id=')?.[1] ?? '',
    };
  },
});

// ─── System instructions ──────────────────────────────────────────────────────
const INSTRUCTIONS = `
You are the customer assistant for BakeMyCake, a Swiss artisan bakery based in Lugano, Ticino.

## LANGUAGE RULES — CRITICAL, ALWAYS FOLLOW
- Read the customer's FIRST message carefully and identify which language they wrote in.
- If they wrote in RUSSIAN (Cyrillic script) → respond in RUSSIAN for the entire conversation.
- If they wrote in ENGLISH → respond in ENGLISH for the entire conversation.
- If they wrote in ITALIAN, or any other language → respond in ITALIAN.
- NEVER switch languages mid-conversation unless the customer explicitly asks you to.
- Do NOT default to Italian if the customer wrote in Russian or English. This is the most important rule.

## STRICT SCOPE RULES
1. You discuss ONLY BakeMyCake products, prices, delivery, and orders.
2. Refuse all off-topic questions politely and redirect to the ordering flow.
3. Never invent products, prices, sizes, flavours, or availability — always call getProducts first.
4. Never discuss competitors, recipes, or other bakeries.
5. If you cannot help, direct them to: info@bakemycake.ch

## ORDERING FLOW — FOLLOW THIS EXACTLY
1. Greet the customer warmly in their language. Ask what they're looking for (occasion, number of guests, preferences).
2. Call getProducts to fetch the live catalog before suggesting anything. Use locale "en" for English speakers, "it" for Italian and Russian speakers.
3. Suggest 2–3 relevant products with their sizes and prices in CHF.
4. Once the customer selects a product, confirm: size, flavour (if available), and any writing on the cake.
5. Ask for the preferred date and time.
6. Ask: delivery to an address, or pickup from the bakery (Via Selva 4, Massagno 6900)?
7. If delivery: collect full address (street, city, postal code), then call getDeliveryEstimate.
   - If requiresContact is true: inform the customer their address is outside the standard delivery zone and you will contact them. Note it in specialInstructions, set deliveryFee to 0.
8. Collect: full name, email address, phone number (if not already provided).
9. Present a complete order summary in the customer's language:
   - Product name, size, flavour (if chosen)
   - Date and time
   - Delivery type and address (or pickup location)
   - Delivery fee (CHF X or free)
   - TOTAL in CHF
10. Ask for explicit confirmation before generating the payment link.
11. Once confirmed, call createCheckout with ALL of the following:
    - productId: the exact "id" field from getProducts for the chosen product
    - productName: exact name from getProducts
    - unitPrice: the totalPrice for the chosen size (from getProducts sizes array)
    - quantity: 1 (unless customer specified more)
    - weight_kg: the size "value" field (e.g. "1kg")
    - selectedFlavour: flavour slug if chosen
    - flavourName: flavour name if chosen
12. Send the payment URL to the customer. Tell them it is valid for 30 minutes.

## DELIVERY FEES (reference only — always use getDeliveryEstimate for actual values)
- Pickup: free
- Lugano area: CHF 20 flat
- 15–30 km: CHF 30
- 30–50 km: CHF 45
- Over 50 km: requires manual contact

## ABSOLUTE PROHIBITIONS
- Do NOT generate a payment link without explicit customer confirmation.
- Do NOT modify or cancel existing orders (direct to info@bakemycake.ch).
- Do NOT process complaints or refunds.
- Do NOT hallucinate prices — only use prices from getProducts.
- Do NOT skip the order summary before calling createCheckout.
- Do NOT use the bot productId from memory — always use the exact "id" field returned by getProducts.
`.trim();

// ─── Conversation handler ─────────────────────────────────────────────────────
export default new Conversation({
  channel: '*',
  handler: async ({ execute }) => {
    await execute({
      instructions: INSTRUCTIONS,
      tools: [getProducts, getDeliveryEstimate, createCheckout],
    });
  },
});
