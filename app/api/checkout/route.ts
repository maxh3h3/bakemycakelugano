import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { urlFor } from '@/lib/sanity/image-url';
import type { SanityImageSource } from '@sanity/image-url/lib/types/types';
import { DeliveryAddressSchema } from '@/lib/schemas/delivery';
import { client as sanityClient } from '@/lib/sanity/client';
import { resolveCheckoutDeliveryFee } from '@/lib/delivery-server';

const MAX_QUANTITY_PER_ITEM = 50;

interface CatalogProduct {
  _id: string;
  name_en?: string;
  name_it?: string;
  price: number;
  sizes?: { value: string; priceModifier?: number }[];
  image?: SanityImageSource;
  flavours?: { _id: string; name_en?: string; name_it?: string }[];
}

class CheckoutValidationError extends Error {}

/**
 * Rebuild the cart from the catalog. Prices, product names and images come from
 * Sanity; the client only chooses product, size, flavour, quantity and writing.
 * Any unitPrice / productName sent in the request is ignored.
 */
async function priceItems(requestedItems: any[], locale: string) {
  const ids = [...new Set(requestedItems.map((item) => String(item?.productId ?? '')))];
  const products: CatalogProduct[] = await sanityClient.fetch(
    `*[_type == "product" && available == true && _id in $ids]{
      _id, name_en, name_it, price,
      "sizes": sizes[]{ value, priceModifier },
      "image": images[0],
      "flavours": availableFlavours[]->{ _id, name_en, name_it }
    }`,
    { ids }
  );
  const byId = new Map(products.map((p) => [p._id, p]));
  const localized = (doc: { name_en?: string; name_it?: string }) =>
    (locale === 'it' ? doc.name_it || doc.name_en : doc.name_en || doc.name_it) || '';

  return requestedItems.map((item) => {
    const product = byId.get(String(item?.productId ?? ''));
    if (!product) {
      throw new CheckoutValidationError(`Unknown or unavailable product: ${item?.productId}`);
    }

    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY_PER_ITEM) {
      throw new CheckoutValidationError(`Invalid quantity for ${product._id}`);
    }

    let unitPrice = product.price;
    if (item.weight_kg && product.sizes?.length) {
      const size = product.sizes.find((s) => s.value === item.weight_kg);
      if (!size) {
        throw new CheckoutValidationError(`Invalid size ${item.weight_kg} for ${product._id}`);
      }
      unitPrice += size.priceModifier || 0;
    }

    const flavour = item.selectedFlavour
      ? product.flavours?.find((f) => f._id === item.selectedFlavour)
      : undefined;

    return {
      productId: product._id,
      productName: localized(product),
      productImageUrl: product.image ?? null,
      quantity,
      unitPrice,
      weight_kg: item.weight_kg || null,
      selectedFlavour: item.selectedFlavour || null,
      flavourName: flavour ? localized(flavour) : item.flavourName || null,
      writingOnCake: item.writingOnCake || null,
    };
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerInfo, deliveryInfo, specialInstructions, items: requestedItems, locale } = body;

    // Validate request
    if (!customerInfo || !deliveryInfo || !Array.isArray(requestedItems) || requestedItems.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    let items: Awaited<ReturnType<typeof priceItems>>;
    try {
      items = await priceItems(requestedItems, locale);
    } catch (error) {
      if (error instanceof CheckoutValidationError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }

    // Delivery fee is computed here too — the fee field in the request is ignored
    const { fee: deliveryFee, requiresContact } = await resolveCheckoutDeliveryFee(deliveryInfo);

    // Calculate totals
    const subtotal = items.reduce((sum, item) => {
      return sum + (item.unitPrice * item.quantity);
    }, 0);

    const DISCOUNT_PERCENTAGE = 0.10;
    const discountAmount = subtotal * DISCOUNT_PERCENTAGE;
    const discountedSubtotal = subtotal - discountAmount;
    const totalAmount = discountedSubtotal + deliveryFee;

    // Simplify items for metadata (Stripe has 500 char limit per field)
    // Only store essential order info - minimize to fit within 500 char limit
    const simplifiedItems = items.map((item: any) => ({
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      // Only include optional fields if present to save space
      ...(item.selectedFlavour && { selectedFlavour: item.selectedFlavour }),
      ...(item.flavourName && { flavourName: item.flavourName }),
      ...(item.weight_kg && { weight_kg: item.weight_kg }),
      ...(item.writingOnCake && { writingOnCake: item.writingOnCake }),
    }));

    // Prepare line items with delivery fee if applicable
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      ...items.map((item: any) => {
        // Build description with size and flavour
        const descriptionParts: string[] = [];
        if (item.weight_kg) {
          descriptionParts.push(`Weight: ${item.weight_kg}`);
        }
        if (item.flavourName) {
          descriptionParts.push(`Flavour: ${item.flavourName}`);
        }
        
        return {
          price_data: {
            currency: 'chf',
            product_data: {
              name: item.productName,
              description: descriptionParts.length > 0 ? descriptionParts.join(' | ') : undefined,
              images: item.productImageUrl 
                ? [urlFor(item.productImageUrl).width(500).height(500).url()]
                : undefined,
            },
            unit_amount: Math.round(item.unitPrice * 100), // Convert to cents
          },
          quantity: item.quantity,
        };
      }),
    ];

    // Add delivery fee as a line item if applicable
    if (deliveryFee > 0) {
      lineItems.push({
        price_data: {
          currency: 'chf',
          product_data: {
            name: locale === 'it' ? 'Consegna nell\'area di Lugano' : 'Delivery to Lugano area',
            description: deliveryInfo.postalCode ? `Postal Code: ${deliveryInfo.postalCode}` : undefined,
          },
          unit_amount: Math.round(deliveryFee * 100),
        },
        quantity: 1,
      });
    }

    // Capture Meta browser identifiers for the Conversions API Purchase
    // event sent later from the Stripe webhook (improves ad attribution)
    const fbp = request.cookies.get('_fbp')?.value || '';
    const fbc = request.cookies.get('_fbc')?.value || '';
    const clientIp = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim();
    const clientUserAgent = request.headers.get('user-agent') || '';

    // Ensure the site-wide 10% discount coupon exists in Stripe
    const COUPON_ID = 'BAKEMYCAKE_SITE_10PCT';
    try {
      await stripe.coupons.retrieve(COUPON_ID);
    } catch {
      // Coupon doesn't exist yet — create it once
      await stripe.coupons.create({
        id: COUPON_ID,
        percent_off: 10,
        duration: 'forever',
        name: locale === 'it' ? 'Sconto 10% — Bake My Cake' : '10% Off — Bake My Cake',
      });
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: lineItems,
      discounts: [{ coupon: COUPON_ID }],
      customer_email: customerInfo.email,
      metadata: {
        customerName: customerInfo.name,
        customerEmail: customerInfo.email,
        customerPhone: customerInfo.phone,
        deliveryType: deliveryInfo.type,
        deliveryDate: deliveryInfo.date || '',
        deliveryTime: deliveryInfo.time || '',
        // Flatten address for Stripe metadata (500 char limit per field)
        deliveryAddressStreet: deliveryInfo.address || '',
        deliveryAddressCity: deliveryInfo.city || '',
        deliveryAddressPostalCode: deliveryInfo.postalCode || '',
        deliveryAddressCountry: deliveryInfo.country || '',
        deliveryFee: deliveryFee.toString(),
        deliveryRequiresContact: requiresContact ? 'true' : 'false',
        specialInstructions: specialInstructions || '',
        orderItems: JSON.stringify(simplifiedItems), // Simplified, no image objects
        discountPercentage: '10',
        discountAmount: discountAmount.toFixed(2),
        locale,
        fbp,
        fbc,
        clientIp,
        clientUserAgent,
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/${locale}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/${locale}/checkout/cancel`,
    });

    // DEBUG: Log session details
    console.log('🔍 Stripe session created:', {
      id: session.id,
      url: session.url,
      payment_status: session.payment_status,
      status: session.status,
      mode: session.mode
    });

    // Create checkout attempt record for analytics
    try {
      // Build delivery address JSONB
      const deliveryAddress = deliveryInfo.type === 'delivery' && deliveryInfo.address
        ? {
            street: deliveryInfo.address,
            city: deliveryInfo.city || '',
            postalCode: deliveryInfo.postalCode || '',
            country: deliveryInfo.country || 'Switzerland'
          }
        : null;

      const { error: attemptError } = await (supabaseAdmin
        .from('checkout_attempts') as any)
        .insert({
          stripe_session_id: session.id,
          customer_email: customerInfo.email,
          customer_name: customerInfo.name,
          customer_phone: customerInfo.phone || null,
          cart_items: simplifiedItems, // Store as JSONB
          total_amount: totalAmount,
          currency: 'chf',
          delivery_type: deliveryInfo.type || null,
          delivery_address: deliveryAddress,
          delivery_fee: deliveryFee,
          special_instructions: specialInstructions || null,
          locale: locale || 'it',
          converted: false, // Will be set to true if payment succeeds
        });

      if (attemptError) {
        console.error('Failed to create checkout attempt:', attemptError);
        // Don't fail the checkout - this is for analytics only
      } else {
        console.log('Checkout attempt created:', session.id);
      }
    } catch (attemptError) {
      console.error('Error creating checkout attempt:', attemptError);
      // Don't fail the checkout - user can still proceed to Stripe
    }

    return NextResponse.json({ sessionUrl: session.url });
  } catch (error) {
    console.error('Checkout API error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

