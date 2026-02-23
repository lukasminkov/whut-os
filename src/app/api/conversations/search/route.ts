import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { searchConversations } from "@/lib/self-improve";

export async function GET(req: NextRequest) {
  const supabase = await createServerClient();
  if (!supabase) return NextResponse.json({ results: [] });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const query = req.nextUrl.searchParams.get("q");
  if (!query) return NextResponse.json({ results: [] });

  const results = await searchConversations(user.id, query);
  return NextResponse.json({ results });
}
