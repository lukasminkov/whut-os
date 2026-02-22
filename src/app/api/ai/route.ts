import { NextRequest } from "next/server";
import { visualizationTools } from "@/lib/visualization-tools";
// sendEmail is now handled client-side via the compose card

const renderEmailComposeTool = {
  name: "render_email_compose",
  description:
    "Render an email compose card for the user to review and send. Use this when the user asks to send, write, or compose an email. The user will be able to edit the fields before sending.",
  input_schema: {
    type: "object" as const,
    properties: {
      to: {
        type: "string",
        description: "Recipient email address",
      },
      subject: {
        type: "string",
        description: "Email subject line",
      },
      body: {
        type: "string",
        description: "Email body text (plain text, can include line breaks with \\n)",
      },
    },
    required: ["to", "subject", "body"],
  },
};

const allTools = [...visualizationTools, renderEmailComposeTool];

export async function POST(req: NextRequest) {
  const { message, history, googleAccessToken, googleRefreshToken } =
    await req.json();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "No API key configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const systemPrompt = `You are WHUT OS — a next-generation AI operating system with a rich visual interface.

You have access to visualization tools that render beautiful interactive components. ALWAYS use the appropriate tool when the user's query would benefit from visual presentation:

- render_cards: For lists of items (destinations, restaurants, products, people, movies, etc.)
- render_comparison: For comparing two or more items side by side
- render_stats: For displaying metrics, KPIs, or numerical summaries
- render_chart: For data trends, analytics, time series
- render_timeline: For chronological events, history, news recaps
- render_table: For structured tabular data
- render_email_compose: Render an email compose card for the user to review and edit before sending. Use when user asks to send/write/compose an email.

IMPORTANT RULES:
1. Use tools proactively — if someone asks "top 5 beaches", use render_cards, don't just type a list
2. You can combine text AND tool calls in the same response — provide brief context text PLUS the visualization
3. Keep text portions concise — the visuals do the heavy lifting
4. For imageQuery fields, use descriptive search terms that would find good photos (e.g., "Clearwater Beach Florida sunset" not just "beach")
5. Provide real, accurate information — don't make up data
6. For ratings, use a 1-5 scale
7. You ARE the OS. Be direct, knowledgeable, and visually expressive.
8. When the user asks to send/compose an email, use render_email_compose. Draft a professional email body. The user reviews and clicks Send.
9. If the user hasn't connected Google, tell them to connect it via the Integrations page first.`;

  const messages = [...(history || []), { role: "user", content: message }];

  try {
    // First Claude call
    let response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        tools: allTools,
        messages,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return new Response(JSON.stringify({ error: err }), {
        status: response.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = await response.json();

    // Handle tool_use blocks that need a tool_result response for Claude
    const toolUseBlocks = (data.content || []).filter(
      (b: any) => b.type === "tool_use" && b.name !== "render_email_compose"
    );

    let finalData = data;

    // For non-visual tool calls, we need to provide tool results back to Claude
    if (data.stop_reason === "tool_use" && toolUseBlocks.length > 0) {
      // For visualization tools, just pass them through — no server execution needed
      // Claude already generated the data we need
    }

    // Parse content blocks into visualization blocks
    const blocks: any[] = [];
    for (const block of finalData.content || []) {
      if (block.type === "text" && block.text) {
        blocks.push({ type: "text", content: block.text });
      } else if (block.type === "tool_use") {
        blocks.push({ type: block.name, data: block.input });
      }
    }

    return new Response(JSON.stringify({ blocks }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
