# WHUT OS — Supabase Setup Guide

## 1. Create Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Name: `whut-os`
4. Generate a strong database password (save it)
5. Region: Pick closest to your users (e.g., us-east-1)
6. Wait for project to finish provisioning

## 2. Run the Database Schema

1. Go to **SQL Editor** in your Supabase dashboard
2. Open `/supabase/schema.sql` from this repo
3. Copy the entire file and paste it into the SQL editor
4. Click **Run** — this creates all tables, RLS policies, indexes, and the auto-profile trigger

### Tables created:
- `profiles` — user profiles (auto-created on signup)
- `integrations` — OAuth tokens (Google, TikTok, etc.)
- `conversations` — chat sessions
- `messages` — chat messages within conversations
- `memories` — AI's learned facts about users
- `usage` — token usage tracking

## 3. Configure Google OAuth in Supabase

1. Go to **Authentication → Providers → Google** in Supabase dashboard
2. Toggle **Enable Google provider** ON
3. Enter your Google OAuth credentials:
   - **Client ID**: From Google Cloud Console (project: elaborate-karma-488216-v3)
   - **Client Secret**: Same project
4. The **Redirect URL** shown in Supabase (e.g., `https://xxx.supabase.co/auth/v1/callback`) must be added to Google Cloud Console:
   - Go to [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials
   - Edit your OAuth 2.0 Client ID
   - Add the Supabase redirect URL to **Authorized redirect URIs**

## 4. Set Environment Variables in Vercel

Go to [Vercel Dashboard](https://vercel.com) → Project Settings → Environment Variables.

Add these for **Production**, **Preview**, and **Development**:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...  (from Supabase → Settings → API → anon/public key)
SUPABASE_SERVICE_ROLE_KEY=eyJ...      (from Supabase → Settings → API → service_role key)
```

**Existing env vars to keep:**
- `ANTHROPIC_API_KEY`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- `ELEVENLABS_API_KEY`

## 5. Configure Redirect URLs

In Supabase Dashboard → Authentication → URL Configuration:

- **Site URL**: `https://whut.ai`
- **Redirect URLs** (add all):
  - `https://whut.ai/api/auth/callback`
  - `https://whut.ai/dashboard`
  - `http://localhost:3000/api/auth/callback` (for local dev)

## 6. Test the Auth Flow

1. Deploy to Vercel (push to main)
2. Go to https://whut.ai/login
3. Click "Sign in with Google"
4. Should redirect to Google → back to `/api/auth/callback` → `/dashboard`
5. Check Supabase dashboard → Authentication → Users — you should see your user
6. Check Table Editor → profiles — your profile should be auto-created

## 7. Verify Integrations

After signing in:
1. Go to /dashboard/integrations
2. Connect Google (Email/Calendar/Drive)
3. Check Supabase Table Editor → integrations — tokens should be stored

## Graceful Degradation

The app works **without** Supabase configured:
- Login falls back to hardcoded credentials
- Dashboard uses localStorage for auth check
- AI route uses tokens from request body
- No conversation persistence or memory

Once Supabase env vars are set, everything switches to the database automatically.

## Local Development

Create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=your-key
GOOGLE_CLIENT_ID=your-id
GOOGLE_CLIENT_SECRET=your-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```
