import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { user_query, ai_response_summary, visualization_type, screenshot_base64, feedback_text, rating } = body;

    if (!feedback_text && !rating) {
      return NextResponse.json({ error: "feedback_text or rating required" }, { status: 400 });
    }

    const admin = createAdminClient();
    if (!admin) return NextResponse.json({ error: "Server error" }, { status: 500 });

    // Upload screenshot if provided
    let screenshot_url: string | null = null;
    if (screenshot_base64) {
      const buffer = Buffer.from(screenshot_base64.replace(/^data:image\/\w+;base64,/, ""), "base64");
      const filename = `${user.id}/${Date.now()}.png`;
      const { error: uploadErr } = await admin.storage
        .from("feedback-screenshots")
        .upload(filename, buffer, { contentType: "image/png", upsert: false });

      if (!uploadErr) {
        const { data: urlData } = admin.storage.from("feedback-screenshots").getPublicUrl(filename);
        screenshot_url = urlData?.publicUrl || null;
      }
    }

    const { data, error } = await admin.from("feedback").insert({
      user_id: user.id,
      user_query: user_query?.slice(0, 500),
      ai_response_summary: ai_response_summary?.slice(0, 500),
      visualization_type,
      screenshot_url,
      feedback_text: feedback_text?.slice(0, 2000),
      rating,
    }).select("id").single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ id: data.id });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
