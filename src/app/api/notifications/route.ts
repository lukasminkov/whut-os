// Notifications API — CRUD for real notifications via Supabase
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const supabase = await createServerClient();
  if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const unreadOnly = req.nextUrl.searchParams.get('unread') === 'true';
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50');

  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (unreadOnly) query = query.eq('read', false);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ notifications: data || [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { type, title, description, action_url, metadata } = body;

  if (!type || !title) {
    return NextResponse.json({ error: 'type and title required' }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: 'Server not configured' }, { status: 503 });

  const { data, error } = await admin
    .from('notifications')
    .insert({
      user_id: user.id,
      type,
      title,
      description: description || '',
      read: false,
      action_url,
      metadata,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notification: data });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createServerClient();
  if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { id, ids, read } = body;

  // Mark single or multiple as read/unread
  const targetIds = ids || (id ? [id] : []);
  if (!targetIds.length) {
    return NextResponse.json({ error: 'id or ids required' }, { status: 400 });
  }

  const { error } = await supabase
    .from('notifications')
    .update({ read: read ?? true })
    .eq('user_id', user.id)
    .in('id', targetIds);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ updated: targetIds.length });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createServerClient();
  if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = req.nextUrl.searchParams.get('id');
  const clearAll = req.nextUrl.searchParams.get('all') === 'true';

  let query = supabase.from('notifications').delete().eq('user_id', user.id);
  if (!clearAll && id) {
    query = query.eq('id', id);
  }

  const { error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
