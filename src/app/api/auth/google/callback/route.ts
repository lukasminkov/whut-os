import { NextRequest, NextResponse } from 'next/server';
import { exchangeCode } from '@/lib/google';
import { createAdminClient } from '@/lib/supabase';
import { createServerClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  if (!code) {
    return NextResponse.redirect(new URL('/dashboard/integrations?error=no_code', req.url));
  }

  try {
    const tokens = await exchangeCode(code);
    if (tokens.error) {
      return NextResponse.redirect(new URL(`/dashboard/integrations?error=${tokens.error}`, req.url));
    }

    // Fetch user's email from Google userinfo
    let email: string | undefined;
    try {
      const infoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (infoRes.ok) {
        const info = await infoRes.json();
        email = info.email;
      }
    } catch {}

    // Try to save tokens server-side to Supabase
    const supabase = await createServerClient();
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const admin = createAdminClient();
        if (admin) {
          await admin.from('integrations').upsert({
            user_id: user.id,
            provider: 'google',
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token || null,
            token_expires_at: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
            scopes: ['gmail', 'calendar', 'drive'],
            account_email: email || null,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id,provider' });
        }
      }
    }

    // Still pass tokens via hash for backward compatibility (localStorage fallback)
    const payload = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + (tokens.expires_in || 3600) * 1000,
      scope: tokens.scope,
      ...(email ? { email } : {}),
    };

    const redirectUrl = new URL('/dashboard/integrations', req.url);
    redirectUrl.hash = `google_tokens=${encodeURIComponent(JSON.stringify(payload))}`;
    return NextResponse.redirect(redirectUrl);
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    return NextResponse.redirect(new URL('/dashboard/integrations?error=exchange_failed', req.url));
  }
}
