import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/session';
import { openai } from '@/lib/openai/client';
import type { AIOrderProcessingRequest, AIOrderProcessingResponse, AIExtractedOrderData } from '@/types/ai-order';

const SYSTEM_PROMPT = `You are an expert order extraction assistant for a Swiss bakery called "Bake My Cake".

Your task is to extract order information from customer conversations (screenshots of WhatsApp/Instagram/SMS messages, emails, or spoken voice transcriptions) and structure it into a JSON format.

**Context:**
- Business location: Switzerland
- Currency: CHF (Swiss Francs)
- Common products: cakes, pastries, birthday cakes, custom cakes
- Delivery types: "pickup" (customer picks up) or "delivery" (bakery delivers)
- Payment methods: "cash", "twint" (Swiss mobile payment), "stripe" (card)
- Channels: "phone", "whatsapp", "instagram", "email", "walk_in"

**Your extraction goals:**
1. **Customer Information**: Name, phone, email, Instagram handle
2. **Order Items**: Product names, quantities, prices, flavours, sizes, decorations, special notes
3. **Delivery Details**: Date, time, type (pickup/delivery), address if delivery
4. **Payment**: Method and whether already paid
5. **Channel**: Infer from context (WhatsApp screenshot = whatsapp, Instagram = instagram, etc.)

**Important Guidelines:**
- Extract dates in YYYY-MM-DD format
- If year is not specified, assume current year: ${new Date().getFullYear()}
- Infer information intelligently (e.g., "tomorrow" → calculate actual date)
- For ambiguous data, set confidence to "medium" or "low" and explain in ai_notes
- Prices should be numeric (e.g., 45.50)
- If customer mentions "writing on cake" or "text on cake", put that in writing_on_cake field
- Internal notes about decorations go in internal_decoration_notes
- Any special staff instructions go in staff_notes
- Default delivery country to "Switzerland" unless specified otherwise

**Response Format:**
Return ONLY valid JSON with this EXACT structure:
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
  "delivery_country": "Switzerland or country name",
  "channel": "phone, whatsapp, instagram, email, or walk_in",
  "customer_notes": "string or null",
  "payment_method": "cash, twint, stripe, or null",
  "paid": true or false,
  "order_items": [
    {
      "product_name": "string (required)",
      "quantity": number (required, default 1),
      "unit_price": number (required, use 0 if unknown),
      "flavour_name": "string or null",
      "weight_kg": string or null (e.g., "1.5", "1.5 kg", "approx 2"),
      "diameter_cm": number or null,
      "writing_on_cake": "string or null",
      "internal_decoration_notes": "string or null",
      "staff_notes": "string or null"
    }
  ],
  "confidence": "high, medium, or low",
  "ai_notes": "string with explanations of what was inferred or missing"
}

CRITICAL: Use these EXACT field names. Do not use "price" - use "unit_price". Do not nest in objects - use flat structure.`;

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Check authentication
    const isAuthenticated = await validateSession();
    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' } as AIOrderProcessingResponse,
        { status: 401 }
      );
    }

    const body: AIOrderProcessingRequest = await request.json();
    const { text, images, context } = body;

    // Validate input
    if (!text && (!images || images.length === 0)) {
      return NextResponse.json(
        { success: false, error: 'Either text or images must be provided' } as AIOrderProcessingResponse,
        { status: 400 }
      );
    }

    // Build messages for OpenAI
    const messages: any[] = [
      {
        role: 'system',
        content: SYSTEM_PROMPT,
      },
    ];

    // Add user message with text and/or images
    const userMessageContent: any[] = [];

    if (text) {
      userMessageContent.push({
        type: 'text',
        text: `Extract order information from the following:\n\n${text}`,
      });
    }

    if (images && images.length > 0) {
      userMessageContent.push({
        type: 'text',
        text: images.length === 1 
          ? 'Analyze this screenshot and extract the order information:'
          : `Analyze these ${images.length} screenshots and extract the order information:`,
      });

      // Add each image
      for (const image of images) {
        // Remove data URL prefix if present
        const base64Data = image.includes('base64,') 
          ? image.split('base64,')[1] 
          : image;
        
        userMessageContent.push({
          type: 'image_url',
          image_url: {
            url: `data:image/jpeg;base64,${base64Data}`,
            detail: 'high', // High detail for better text extraction
          },
        });
      }
    }

    // Add context information if provided
    if (context) {
      let contextText = '\n\nAdditional context:\n';
      if (context.defaultCountry) {
        contextText += `- Default country: ${context.defaultCountry}\n`;
      }
      if (context.currentDate) {
        contextText += `- Current date: ${context.currentDate}\n`;
      }
      userMessageContent.push({
        type: 'text',
        text: contextText,
      });
    }

    messages.push({
      role: 'user',
      content: userMessageContent,
    });

    // Call OpenAI GPT-4 Vision
    console.log('Calling OpenAI API for order extraction...');
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o', // GPT-4 Omni - supports vision and is faster/cheaper than gpt-4-vision-preview
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.1, // Low temperature for more consistent extraction
      max_tokens: 2000,
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    console.log('OpenAI response:', responseText);

    // Parse the JSON response
    let extractedData: AIExtractedOrderData;
    try {
      const rawData = JSON.parse(responseText);
      
      // Normalize the data structure in case AI returns nested objects
      extractedData = {
        customer_name: rawData.customer_name || rawData.customer?.name || null,
        customer_email: rawData.customer_email || rawData.customer?.email || null,
        customer_phone: rawData.customer_phone || rawData.customer?.phone || null,
        customer_ig_handle: rawData.customer_ig_handle || rawData.customer?.instagram_handle || null,
        delivery_date: rawData.delivery_date || rawData.delivery?.date || null,
        delivery_time: rawData.delivery_time || rawData.delivery?.time || null,
        delivery_type: rawData.delivery_type || rawData.delivery?.type || null,
        delivery_address: rawData.delivery_address || rawData.delivery?.address || null,
        delivery_city: rawData.delivery_city || rawData.delivery?.city || null,
        delivery_postal_code: rawData.delivery_postal_code || rawData.delivery?.postal_code || null,
        delivery_country: rawData.delivery_country || rawData.delivery?.country || 'Switzerland',
        channel: rawData.channel || null,
        customer_notes: rawData.customer_notes || null,
        payment_method: rawData.payment_method || rawData.payment?.method || null,
        paid: rawData.paid || rawData.payment?.already_paid || false,
        order_items: (rawData.order_items || []).map((item: any) => ({
          product_name: item.product_name || 'Unknown Product',
          quantity: item.quantity || 1,
          unit_price: item.unit_price || item.price || 0,
          flavour_name: item.flavour_name || item.flavours || null,
          weight_kg: item.weight_kg || null,
          diameter_cm: item.diameter_cm || null,
          writing_on_cake: item.writing_on_cake || null,
          internal_decoration_notes: item.internal_decoration_notes || item.decorations || null,
          staff_notes: item.staff_notes || item.special_notes || null,
        })),
        confidence: rawData.confidence || 'medium',
        ai_notes: rawData.ai_notes || null,
      };
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to parse AI response. Please try again or enter order manually.',
        } as AIOrderProcessingResponse,
        { status: 500 }
      );
    }

    // Validate that we have at least some order items
    if (!extractedData.order_items || extractedData.order_items.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No order items could be extracted. Please ensure the input contains clear order information.',
        } as AIOrderProcessingResponse,
        { status: 400 }
      );
    }

    const processingTime = Date.now() - startTime;
    console.log(`Order extraction completed in ${processingTime}ms`);

    return NextResponse.json({
      success: true,
      data: extractedData,
      processingTime,
    } as AIOrderProcessingResponse);

  } catch (error) {
    console.error('Error in AI order extraction:', error);
    
    // Check if it's an OpenAI API error
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'OpenAI API key not configured. Please contact administrator.',
          } as AIOrderProcessingResponse,
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process order extraction. Please try again.',
      } as AIOrderProcessingResponse,
      { status: 500 }
    );
  }
}
