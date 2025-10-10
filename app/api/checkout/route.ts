import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/server';
import { urlFor } from '@/lib/sanity/image-url';
import type { SanityImageSource } from '@sanity/image-url/lib/types/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerInfo, deliveryInfo, specialInstructions, items, locale } = body;

    // Validate request
    if (!customerInfo || !deliveryInfo || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Calculate total
    const totalAmount = items.reduce((sum: number, item: any) => {
      return sum + (item.unitPrice * item.quantity);
    }, 0);

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: items.map((item: any) => ({
        price_data: {
          currency: 'chf',
          product_data: {
            name: item.productName,
            description: item.sizeLabel 
              ? `Size: ${item.sizeLabel}${item.deliveryDate ? ` | Delivery: ${item.deliveryDate}` : ''}`
              : item.deliveryDate ? `Delivery: ${item.deliveryDate}` : undefined,
            images: item.productImageUrl 
              ? [urlFor(item.productImageUrl).width(500).height(500).url()]
              : undefined,
          },
          unit_amount: Math.round(item.unitPrice * 100), // Convert to cents
        },
        quantity: item.quantity,
      })),
      customer_email: customerInfo.email,
      metadata: {
        customerName: customerInfo.name,
        customerEmail: customerInfo.email,
        customerPhone: customerInfo.phone,
        deliveryType: deliveryInfo.type,
        deliveryAddress: deliveryInfo.address || '',
        deliveryCity: deliveryInfo.city || '',
        deliveryPostalCode: deliveryInfo.postalCode || '',
        deliveryCountry: deliveryInfo.country || '',
        specialInstructions: specialInstructions || '',
        orderItems: JSON.stringify(items),
        locale,
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/${locale}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/${locale}/checkout/cancel`,
    });

    return NextResponse.json({ sessionUrl: session.url });
  } catch (error) {
    console.error('Checkout API error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

