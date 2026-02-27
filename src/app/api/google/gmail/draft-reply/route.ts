import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(req: NextRequest) {
  let body: { from: string; to: string; subject: string; emailBody: string; instructions?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { from, to, subject, emailBody, instructions } = body;
  if (!emailBody) {
    return NextResponse.json({ error: 'Missing emailBody' }, { status: 400 });
  }

  try {
    const client = new Anthropic();
    const prompt = `You are drafting a reply to an email. Write a concise, professional reply.

Original email:
From: ${from}
To: ${to}
Subject: ${subject}
Body:
${emailBody.slice(0, 3000)}

${instructions ? `User instructions: ${instructions}` : 'Write an appropriate, helpful reply.'}

Write ONLY the reply body text. No subject line, no greeting formatting instructions. Keep it natural and concise.`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const draft = response.content[0]?.type === 'text' ? response.content[0].text : '';
    return NextResponse.json({ draft });
  } catch (err: unknown) {
    console.error('Draft reply error:', err);
    return NextResponse.json({ error: 'Failed to generate draft' }, { status: 500 });
  }
}
