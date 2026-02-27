// Database helpers for AI route

import { createAdminClient, isSupabaseServerConfigured } from "@/lib/supabase";
import { createServerClient } from "@/lib/supabase-server";
import type { GoogleTokens } from "./types";

export async function getUser(): Promise<{ id: string; email?: string } | null> {
  if (!isSupabaseServerConfigured()) return null;
  try {
    const supabase = await createServerClient();
    if (!supabase) return null;
    const { data: { user } } = await supabase.auth.getUser();
    return user ? { id: user.id, email: user.email } : null;
  } catch { return null; }
}

export async function getGoogleTokens(userId: string): Promise<GoogleTokens | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin.from('integrations')
    .select('access_token, refresh_token')
    .eq('user_id', userId).eq('provider', 'google').single();
  return data ? { access: data.access_token, refresh: data.refresh_token || "" } : null;
}

export async function updateGoogleToken(userId: string, token: string): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;
  await admin.from('integrations').update({
    access_token: token,
    token_expires_at: new Date(Date.now() + 3600_000).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId).eq('provider', 'google');
}

export async function loadIntegrations(userId: string): Promise<string[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from('integrations').select('provider').eq('user_id', userId);
  return (data || []).map(i => i.provider);
}

export async function loadHistory(conversationId: string): Promise<{ role: string; content: string }[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from('messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(20);
  return data ? data.reverse().map(m => ({ role: m.role, content: m.content })) : [];
}

export async function getMessageCount(conversationId: string): Promise<number> {
  const admin = createAdminClient();
  if (!admin) return 0;
  const { count } = await admin.from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conversationId);
  return count || 0;
}

export async function saveMessage(
  conversationId: string, role: string, content: string,
  extra?: { scene_data?: Record<string, unknown>; model?: string; tokens_in?: number; tokens_out?: number },
): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;
  await admin.from('messages').insert({
    conversation_id: conversationId,
    role,
    content,
    scene_data: extra?.scene_data || null,
    model: extra?.model || null,
    tokens_in: extra?.tokens_in || null,
    tokens_out: extra?.tokens_out || null,
  });
  await admin.from('conversations').update({
    last_message_at: new Date().toISOString(),
  }).eq('id', conversationId);
}
