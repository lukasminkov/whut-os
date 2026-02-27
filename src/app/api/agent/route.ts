// Agent Execution API — Plans and executes multi-step tasks
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface PlanStep {
  description: string;
  toolName: string;
  toolParams: Record<string, unknown>;
  integrationId?: string;
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { intent, connectedIntegrations } = await req.json();
  if (!intent) return NextResponse.json({ error: 'Intent required' }, { status: 400 });

  try {
    // Use Claude to plan the task steps
    const planResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: `You are a task planner for WHUT OS. Break down user intents into executable steps.
Each step should use one of the available tools. Return a JSON array of steps.

Available integrations and tools:
${(connectedIntegrations || []).map((i: string) => `- ${i}`).join('\n')}

Available tool names: fetch_emails, get_email, send_email, archive_email, fetch_calendar, create_calendar_event, update_calendar_event, delete_calendar_event, fetch_drive_files, create_drive_document, notion_search, notion_get_page, notion_create_page, notion_update_page, notion_query_database, notion_append_blocks, slack_list_channels, slack_read_messages, slack_send_message, slack_search_messages, slack_list_users, telegram_send_message, telegram_get_updates, search_web, read_page, display

Respond ONLY with a JSON array of steps, each having: description, toolName, toolParams, integrationId (optional).
If the task is simple (single action), return a single step.`,
      messages: [{ role: 'user', content: intent }],
    });

    const content = planResponse.content[0];
    let steps: PlanStep[] = [];

    if (content.type === 'text') {
      // Extract JSON from response
      const jsonMatch = content.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        steps = JSON.parse(jsonMatch[0]);
      }
    }

    if (!steps.length) {
      return NextResponse.json({ error: 'Could not plan task' }, { status: 400 });
    }

    return NextResponse.json({
      taskId: crypto.randomUUID(),
      intent,
      steps: steps.map((s, i) => ({
        id: crypto.randomUUID(),
        index: i,
        ...s,
        status: 'pending',
        requiresApproval: isExternalAction(s.toolName),
      })),
    });
  } catch (err) {
    console.error('Agent planning error:', err);
    return NextResponse.json({ error: 'Planning failed' }, { status: 500 });
  }
}

function isExternalAction(toolName: string): boolean {
  const externalTools = [
    'send_email', 'archive_email', 'create_calendar_event', 'update_calendar_event',
    'delete_calendar_event', 'create_drive_document', 'notion_create_page',
    'notion_update_page', 'notion_append_blocks', 'slack_send_message',
    'telegram_send_message', 'telegram_send_document',
  ];
  return externalTools.includes(toolName);
}
