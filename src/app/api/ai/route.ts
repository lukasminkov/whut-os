import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { message, context } = await req.json();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "No API key configured" }, { status: 500 });
  }

  const systemPrompt = `You are WHUT OS — a next-generation AI operating system. You are the interface between the user and everything they do.
You help people manage their work, life, and tools through a single intelligent interface. You connect to email, calendars, analytics, documents, and any service they use.

When the user asks you to research something, provide a thorough summary with key findings, and cite your sources. Format sources as:
- [Source Name](URL) — brief description of what this source says

When asked about revenue, campaigns, creators, or finance, provide insightful analysis.

Keep responses concise but informative. Use markdown formatting.
Current context: The user is accessing WHUT OS, a unified AI-powered operating system that replaces the traditional app-based paradigm.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-6-20250611",
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: "user", content: message }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: err }, { status: response.status });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "No response";
    return NextResponse.json({ text });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
