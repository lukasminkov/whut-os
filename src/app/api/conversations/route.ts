import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

// GET: List conversations (or get active one)
export async function GET(req: NextRequest) {
  const supabase = await createServerClient();
  if (!supabase) return NextResponse.json({ conversations: [] });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const active = req.nextUrl.searchParams.get('active');
  if (active === 'true') {
    // Get conversation from last 2 hours
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', user.id)
      .gte('last_message_at', twoHoursAgo)
      .order('last_message_at', { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({ conversation: data });
  }

  const { data } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', user.id)
    .order('last_message_at', { ascending: false })
    .limit(50);

  return NextResponse.json({ conversations: data || [] });
}

// POST: Create new conversation
export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  const { data, error } = await supabase
    .from('conversations')
    .insert({ user_id: user.id, title: body.title || null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ conversation: data });
}
