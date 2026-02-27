import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { createServerClient } from '@/lib/supabase-server';

// GET: Fetch user's integration tokens
export async function GET(req: NextRequest) {
  const supabase = await createServerClient();
  if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const provider = req.nextUrl.searchParams.get('provider');
  let query = supabase.from('integrations').select('*').eq('user_id', user.id);
  if (provider) query = query.eq('provider', provider);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ integrations: data });
}

// POST: Save/update integration tokens
export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { provider, access_token, refresh_token, token_expires_at, scopes, account_email, metadata } = body;

  if (!provider || !access_token) {
    return NextResponse.json({ error: 'provider and access_token required' }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: 'Server not configured' }, { status: 503 });

  const { data, error } = await admin.from('integrations').upsert({
    user_id: user.id,
    provider,
    access_token,
    refresh_token: refresh_token || null,
    token_expires_at: token_expires_at || null,
    scopes: scopes || [],
    account_email: account_email || null,
    metadata: metadata || {},
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,provider' }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ integration: data });
}

// DELETE: Remove integration tokens
export async function DELETE(req: NextRequest) {
  const supabase = await createServerClient();
  if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { provider } = body;

  if (!provider) {
    return NextResponse.json({ error: 'provider required' }, { status: 400 });
  }

  const { error } = await supabase
    .from('integrations')
    .delete()
    .eq('user_id', user.id)
    .eq('provider', provider);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ deleted: true });
}
