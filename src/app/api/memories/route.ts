import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

// GET: List user's memories
export async function GET(req: NextRequest) {
  const supabase = await createServerClient();
  if (!supabase) return NextResponse.json({ memories: [] });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await supabase
    .from('memories')
    .select('*')
    .eq('user_id', user.id)
    .order('importance', { ascending: false })
    .limit(50);

  return NextResponse.json({ memories: data || [] });
}

// POST: Add explicit memory
export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { data, error } = await supabase
    .from('memories')
    .insert({
      user_id: user.id,
      category: body.category || 'fact',
      content: body.content,
      importance: body.importance || 0.5,
      source: body.source || 'explicit',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ memory: data });
}
