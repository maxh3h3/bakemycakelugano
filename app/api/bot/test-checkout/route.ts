import { NextRequest, NextResponse } from 'next/server';

// Mock endpoint to diagnose whether the bot can reach our server at all
// and what payload it sends when calling createCheckout
export async function POST(request: NextRequest) {
  const body = await request.json();
  console.log('🤖 BOT CHECKOUT TEST RECEIVED:', JSON.stringify(body, null, 2));
  return NextResponse.json({
    sessionUrl: 'https://checkout.stripe.com/c/pay/MOCK_SESSION_FOR_TESTING',
  });
}
