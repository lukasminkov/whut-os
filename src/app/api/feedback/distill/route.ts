import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    if (!admin) return NextResponse.json({ error: "Server error" }, { status: 500 });

    // Fetch all non-distilled feedback
    const { data: entries, error } = await admin
      .from("feedback")
      .select("user_query, ai_response_summary, visualization_type, feedback_text, rating")
      .eq("user_id", user.id)
      .eq("distilled", false)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error || !entries?.length) {
      return NextResponse.json({ message: "No new feedback to distill" });
    }

    // Use Claude to distill feedback into a concise preferences summary
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "No AI key" }, { status: 500 });

    const feedbackText = entries.map((e, i) => {
      const emoji = e.rating === "up" ? "👍" : "👎";
      return `${i + 1}. ${emoji} [${e.visualization_type || "general"}] "${e.feedback_text}" (query: "${e.user_query?.slice(0, 80) || "n/a"}")`;
    }).join("\n");

    // Get existing preferences to merge
    const { data: existingPrefs } = await admin
      .from("design_preferences")
      .select("summary")
      .eq("user_id", user.id)
      .single();

    const existingBlock = existingPrefs?.summary
      ? `\n\nExisting preferences to merge with:\n${existingPrefs.summary}`
      : "";

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: `Distill these user feedback entries about an AI visualization OS into a concise design preferences summary (max 500 words). Focus on patterns: what they like/dislike, preferred visualization types, style preferences, common complaints.${existingBlock}

Feedback entries:
${feedbackText}

Write a concise, actionable summary that an AI can use to improve future visualizations. Use bullet points.`,
        }],
      }),
    });

    if (!response.ok) return NextResponse.json({ error: "AI distillation failed" }, { status: 500 });

    const result = await response.json();
    const summary = result.content?.[0]?.text || "";

    // Upsert design preferences
    await admin.from("design_preferences").upsert({
      user_id: user.id,
      summary,
      feedback_count: entries.length + (existingPrefs ? 0 : 0),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    // Mark feedback as distilled
    // Mark all non-distilled feedback as distilled
    await admin.from("feedback").update({ distilled: true }).eq("user_id", user.id).eq("distilled", false);

    return NextResponse.json({ summary, distilled_count: entries.length });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
