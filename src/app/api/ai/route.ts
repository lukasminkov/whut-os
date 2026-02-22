import { NextRequest } from "next/server";
import { visualizationTools } from "@/lib/visualization-tools";
import { sendEmail, refreshAccessToken } from "@/lib/google";

const sendEmailTool = {
  name: "send_email",
  description:
    "Send an email on behalf of the user via their connected Gmail account. Use this when the user asks to send, write, or compose an email to someone.",
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
        description: "Email body text",
      },
    },
    required: ["to", "subject", "body"],
  },
};

const allTools = [...visualizationTools, sendEmailTool];

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
- send_email: Send an email via the user's connected Gmail. Use when user asks to send/write/compose an email.

IMPORTANT RULES:
1. Use tools proactively — if someone asks "top 5 beaches", use render_cards, don't just type a list
2. You can combine text AND tool calls in the same response — provide brief context text PLUS the visualization
3. Keep text portions concise — the visuals do the heavy lifting
4. For imageQuery fields, use descriptive search terms that would find good photos (e.g., "Clearwater Beach Florida sunset" not just "beach")
5. Provide real, accurate information — don't make up data
6. For ratings, use a 1-5 scale
7. You ARE the OS. Be direct, knowledgeable, and visually expressive.
8. When the user asks to send an email, use the send_email tool. If they don't specify all fields, compose a professional email based on context.
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

    let data = await response.json();

    // Check if Claude wants to use send_email — execute it server-side
    const sendEmailBlock = (data.content || []).find(
      (b: any) => b.type === "tool_use" && b.name === "send_email"
    );

    if (sendEmailBlock) {
      let toolResult: string;

      if (!googleAccessToken) {
        toolResult =
          "ERROR: Google is not connected. The user needs to connect their Google account via the Integrations page first.";
      } else {
        try {
          const { to, subject, body } = sendEmailBlock.input;
          let token = googleAccessToken;

          try {
            await sendEmail(token, to, subject, body);
            toolResult = `Email sent successfully to ${to} with subject "${subject}".`;
          } catch (err: any) {
            // Try token refresh on 401
            if (
              googleRefreshToken &&
              err.message?.includes("401")
            ) {
              const refreshed = await refreshAccessToken(googleRefreshToken);
              if (refreshed.access_token) {
                token = refreshed.access_token;
                await sendEmail(token, to, subject, body);
                toolResult = `Email sent successfully to ${to} with subject "${subject}".`;
              } else {
                throw new Error("Token refresh failed");
              }
            } else {
              throw err;
            }
          }
        } catch (err: any) {
          toolResult = `Failed to send email: ${err.message}`;
        }
      }

      // Feed result back to Claude for final response
      const followUpMessages = [
        ...messages,
        { role: "assistant", content: data.content },
        {
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: sendEmailBlock.id,
              content: toolResult,
            },
          ],
        },
      ];

      response = await fetch("https://api.anthropic.com/v1/messages", {
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
          messages: followUpMessages,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        return new Response(JSON.stringify({ error: err }), {
          status: response.status,
          headers: { "Content-Type": "application/json" },
        });
      }

      data = await response.json();
    }

    // Parse content blocks into visualization blocks
    const blocks: any[] = [];
    for (const block of data.content || []) {
      if (block.type === "text" && block.text) {
        blocks.push({ type: "text", content: block.text });
      } else if (block.type === "tool_use") {
        // Only pass visualization tools to frontend, not send_email
        if (block.name !== "send_email") {
          blocks.push({ type: block.name, data: block.input });
        }
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
