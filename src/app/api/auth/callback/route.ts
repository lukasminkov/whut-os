import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const redirectTo = new URL('/dashboard', req.url);

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', req.url));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.redirect(new URL('/login?error=not_configured', req.url));
  }

  // Build a redirect response first, then attach cookies to it
  let response = NextResponse.redirect(redirectTo);

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error('Auth callback error:', error);
    return NextResponse.redirect(new URL('/login?error=auth_failed', req.url));
  }

  // After successful auth, save Google tokens to integrations table if available
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.provider_token) {
    try {
      const { createAdminClient } = await import('@/lib/supabase');
      const admin = createAdminClient();
      if (admin) {
        await admin.from('integrations').upsert({
          user_id: session.user.id,
          provider: 'google',
          access_token: session.provider_token,
          refresh_token: session.provider_refresh_token || null,
          token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
          scopes: ['gmail', 'calendar', 'drive'],
          account_email: session.user.email,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,provider' });
      }
    } catch (e) {
      console.error('Failed to save Google tokens:', e);
    }
  }

  return response;
}
