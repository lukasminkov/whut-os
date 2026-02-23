import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = createAdminClient();
    if (!supabase) return Response.json({ ok: false });
    
    await supabase.from("interactions").insert({
      type: body.type,
      element_id: body.elementId,
      element_type: body.elementType,
      data: body,
      created_at: new Date().toISOString(),
    });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false });
  }
}
