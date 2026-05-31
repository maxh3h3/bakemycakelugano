import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/auth/require-admin-role';
import { openai } from '@/lib/openai/client';

export async function POST(request: NextRequest) {
  const auth = await requireAdminRole(['owner']);
  if (auth instanceof NextResponse) return auth;

  const { ownerNote, threadContext } = await request.json();
  if (!ownerNote) return NextResponse.json({ error: 'ownerNote required' }, { status: 400 });

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You write replies for Bake My Cake, a small artisan bakery in Lugano.

Rules:
- Match the customer's language (Italian, French, English, German)
- Write like a real person, not a company. Short sentences. Direct.
- No "I hope this message finds you well", no filler, no double dashes
- No excessive formality. Friendly but to the point.
- Sign off simply: "Bake My Cake"
- Output only the email body, nothing else`,
      },
      {
        role: 'user',
        content: `${threadContext ? `Email thread:\n${threadContext}\n\n` : ''}Owner's intent: ${ownerNote}`,
      },
    ],
    temperature: 0.7,
    max_tokens: 600,
  });

  return NextResponse.json({ draft: completion.choices[0]?.message?.content || '' });
}
