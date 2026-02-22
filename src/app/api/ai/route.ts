import { NextRequest } from "next/server";
import { renderSceneTool, wrapV1Block } from "@/lib/scene-types";
import { sendEmail, refreshAccessToken } from "@/lib/google";
import {
  SKILL_CORE_OS,
  SKILL_ONBOARDING,
  INTEGRATION_SKILLS,
} from "@/lib/skills";

// Legacy tools kept for backward compat detection only
const V1_TOOL_NAMES = [
  "render_cards",
  "render_comparison",
  "render_stats",
  "render_chart",
  "render_timeline",
  "render_table",
  "render_email_compose",
];

// ── Skill Loading ──────────────────────────────────────────────

function loadSkills(connectedIntegrations: string[], isOnboarding: boolean): string {
  const skills: string[] = [SKILL_CORE_OS];

  if (isOnboarding) {
    skills.push(SKILL_ONBOARDING);
    return skills.join("\n\n---\n\n");
  }

  // Load integration skills based on connected integrations
  for (const integration of connectedIntegrations) {
    const skill = INTEGRATION_SKILLS[integration];
    if (skill) skills.push(skill);
  }

  return skills.join("\n\n---\n\n");
}

// ── System Prompt Builder ──────────────────────────────────────

interface UserProfile {
  name?: string;
  company?: string;
  role?: string;
  timezone?: string;
  onboardingStep?: string; // "welcome" | "name" | "role" | "integrations" | "complete"
}

function buildSystemPrompt(context?: {
  integrations?: string[];
  screen?: { width: number; height: number };
  time?: string;
  timezone?: string;
  userProfile?: UserProfile;
}) {
  const integrations = context?.integrations || [];
  const integrationsStr = integrations.length ? integrations.join(", ") : "none";
  const screen = context?.screen
    ? `${context.screen.width}x${context.screen.height}`
    : "unknown";
  const device =
    context?.screen && context.screen.width < 768
      ? "mobile"
      : context?.screen && context.screen.width < 1024
        ? "tablet"
        : "desktop";
  const time = context?.time || new Date().toISOString();
  const tz = context?.timezone || context?.userProfile?.timezone || "UTC";

  const profile = context?.userProfile;
  const isOnboarding = !profile?.name || profile?.onboardingStep === "welcome" || profile?.onboardingStep === "name" || profile?.onboardingStep === "role" || profile?.onboardingStep === "integrations";

  // Load skills dynamically
  const skillsContent = loadSkills(integrations, isOnboarding);

  // Build user context block
  let userContext = "";
  if (profile?.name) {
    userContext = `
## User Profile
- Name: ${profile.name}${profile.company ? `\n- Company: ${profile.company}` : ""}${profile.role ? `\n- Role: ${profile.role}` : ""}
- Timezone: ${tz}
- Connected integrations: ${integrationsStr}`;
  } else {
    userContext = `
## User Profile
- NEW USER — no profile yet. Begin onboarding.
- Connected integrations: ${integrationsStr}`;
  }

  // Onboarding context
  let onboardingContext = "";
  if (isOnboarding) {
    const step = profile?.onboardingStep || "welcome";
    onboardingContext = `
## ONBOARDING MODE
Current step: ${step}
${profile?.name ? `Name collected: ${profile.name}` : "Name: not yet collected"}
${profile?.company ? `Company: ${profile.company}` : ""}
${profile?.role ? `Role: ${profile.role}` : ""}

Follow the onboarding flow described in the Onboarding Skill above.
- If step is "welcome": Greet them and ask their name
- If step is "name": They just told you their name. Acknowledge it warmly, ask what they do (company/role)
- If step is "role": They told you their role. Show available integrations as a card-grid
- If step is "integrations": Thank them, complete onboarding with a welcoming scene`;
  }

  return `${skillsContent}

${userContext}

## Context (this request)
- Screen: ${screen} (${device})
- Time: ${time} (${tz})
${onboardingContext}

## UI Theme
Glass morphism dark theme. All components render with translucent glass cards, subtle borders, and backdrop blur.`;
}

export async function POST(req: NextRequest) {
  const {
    message,
    history,
    googleAccessToken,
    googleRefreshToken,
    context,
    userProfile,
  } = await req.json();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "No API key configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Merge userProfile into context
  const enrichedContext = {
    ...context,
    userProfile: userProfile || {},
  };

  const systemPrompt = buildSystemPrompt(enrichedContext);
  const messages = [...(history || []), { role: "user", content: message }];

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
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
        tools: [renderSceneTool],
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

    // Execute server-side actions from render_scene tool calls
    const actionResults: Record<string, any> = {};
    for (const block of data.content || []) {
      if (block.type === "tool_use" && block.name === "render_scene") {
        const actions = block.input?.actions || [];
        for (const action of actions) {
          if (action.type === "send_email" && action.params) {
            const { to, subject, body } = action.params;
            if (to && subject && body) {
              let token = googleAccessToken;
              try {
                const result = await sendEmail(token, to, subject, body);
                actionResults["send_email"] = { success: true, messageId: result.id };
              } catch (err: any) {
                if (googleRefreshToken && err.message?.includes("401")) {
                  try {
                    const refreshed = await refreshAccessToken(googleRefreshToken);
                    if (refreshed.access_token) {
                      const result = await sendEmail(refreshed.access_token, to, subject, body);
                      actionResults["send_email"] = { success: true, messageId: result.id };
                    }
                  } catch {
                    actionResults["send_email"] = { success: false, error: "Token refresh failed" };
                  }
                } else {
                  actionResults["send_email"] = { success: false, error: err.message };
                }
              }
            }
          }
        }
      }
    }

    // Parse content blocks into response format
    const blocks: any[] = [];
    for (const block of data.content || []) {
      if (block.type === "text" && block.text) {
        blocks.push({ type: "text", content: block.text });
      } else if (block.type === "tool_use") {
        if (block.name === "render_scene") {
          blocks.push({
            type: "render_scene",
            data: block.input,
            actionResults,
          });
        } else if (V1_TOOL_NAMES.includes(block.name)) {
          const sceneNode = wrapV1Block(block.name, block.input);
          blocks.push({
            type: "render_scene",
            data: {
              layout: { type: "stack", gap: 12, children: [sceneNode] },
            },
          });
          blocks.push({ type: block.name, data: block.input });
        }
      }
    }

    const sceneBlock = blocks.find((b: any) => b.type === "render_scene");
    const scene = sceneBlock ? sceneBlock.data : undefined;

    // Pass Claude's token usage back to the client for usage tracking
    const usage = data.usage
      ? {
          input_tokens: data.usage.input_tokens ?? 0,
          output_tokens: data.usage.output_tokens ?? 0,
          model: "claude-sonnet-4-20250514",
        }
      : undefined;

    return new Response(JSON.stringify({ blocks, scene, usage }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
