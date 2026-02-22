import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { createServerClient } from '@/lib/supabase-server';

// GET: Get messages for a conversation
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerClient();
  if (!supabase) return NextResponse.json({ messages: [] });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify conversation belongs to user
  const { data: conv } = await supabase
    .from('conversations')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!conv) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '20');
  const { data } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })
    .limit(limit);

  return NextResponse.json({ messages: data || [] });
}

// POST: Add message to conversation
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  const { data, error } = await admin
    .from('messages')
    .insert({
      conversation_id: id,
      role: body.role,
      content: body.content,
      cards_json: body.cards_json || null,
      tool_calls: body.tool_calls || null,
      model: body.model || null,
      tokens_in: body.tokens_in || null,
      tokens_out: body.tokens_out || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update conversation
  await admin
    .from('conversations')
    .update({
      last_message_at: new Date().toISOString(),
      message_count: body.message_count || undefined,
    })
    .eq('id', id);

  return NextResponse.json({ message: data });
}
