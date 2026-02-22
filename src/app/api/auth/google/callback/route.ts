import { NextRequest, NextResponse } from 'next/server';
import { exchangeCode } from '@/lib/google';

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

    // Build token payload to store client-side
    const payload = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + (tokens.expires_in || 3600) * 1000,
      scope: tokens.scope,
    };

    // Redirect to integrations page with tokens in hash (not query — keeps them out of server logs)
    const redirectUrl = new URL('/dashboard/integrations', req.url);
    redirectUrl.hash = `google_tokens=${encodeURIComponent(JSON.stringify(payload))}`;
    return NextResponse.redirect(redirectUrl);
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    return NextResponse.redirect(new URL('/dashboard/integrations?error=exchange_failed', req.url));
  }
}
