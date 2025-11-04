import { NextResponse } from 'next/server';

// TEMPORARY DEBUG ROUTE - DELETE AFTER TESTING
export async function GET() {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  return NextResponse.json({
    webhookSecretLoaded: !!webhookSecret,
    firstChars: webhookSecret?.substring(0, 20) || 'NOT SET',
    expectedLocal: 'whsec_c9347a8bc6b5e6',
    expectedRailway: 'whsec_u09YagVYuUT3J6',
    matches: webhookSecret?.startsWith('whsec_c9347') ? 'LOCAL ✅' : 
            webhookSecret?.startsWith('whsec_u09Y') ? 'RAILWAY ❌' : 
            'NEITHER ❓'
  });
}

