import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/server';
import { supabaseAdmin } from '@/lib/supabase/server';
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

    // Calculate totals
    const subtotal = items.reduce((sum: number, item: any) => {
      return sum + (item.unitPrice * item.quantity);
    }, 0);
    
    const deliveryFee = deliveryInfo.fee || 0;
    const totalAmount = subtotal + deliveryFee;

    // Simplify items for metadata (Stripe has 500 char limit per field)
    // Only store essential order info - images can be fetched from Sanity if needed
    const simplifiedItems = items.map((item: any) => ({
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      selectedSize: item.selectedSize || null,
      sizeLabel: item.sizeLabel || null,
      selectedFlavour: item.selectedFlavour || null,
      flavourName: item.flavourName || null,
      deliveryDate: item.deliveryDate || null,
    }));

    // Prepare line items with delivery fee if applicable
    const lineItems = [
      ...items.map((item: any) => {
        // Build description with size, flavour, and delivery date
        const descriptionParts: string[] = [];
        if (item.sizeLabel) {
          descriptionParts.push(`Size: ${item.sizeLabel}`);
        }
        if (item.flavourName) {
          descriptionParts.push(`Flavour: ${item.flavourName}`);
        }
        if (item.deliveryDate) {
          descriptionParts.push(`Delivery: ${item.deliveryDate}`);
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

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: lineItems,
      customer_email: customerInfo.email,
      metadata: {
        customerName: customerInfo.name,
        customerEmail: customerInfo.email,
        customerPhone: customerInfo.phone,
        deliveryType: deliveryInfo.type,
        deliveryDate: deliveryInfo.date || '',
        deliveryAddress: deliveryInfo.address || '',
        deliveryCity: deliveryInfo.city || '',
        deliveryPostalCode: deliveryInfo.postalCode || '',
        deliveryCountry: deliveryInfo.country || '',
        deliveryFee: deliveryFee.toString(),
        deliveryRequiresContact: deliveryInfo.requiresContact ? 'true' : 'false',
        specialInstructions: specialInstructions || '',
        orderItems: JSON.stringify(simplifiedItems), // Simplified, no image objects
        locale,
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
          delivery_address: deliveryInfo.address || null,
          delivery_city: deliveryInfo.city || null,
          delivery_postal_code: deliveryInfo.postalCode || null,
          delivery_country: deliveryInfo.country || 'Switzerland',
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

