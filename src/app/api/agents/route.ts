import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const TOOL_DESCRIPTIONS: Record<string, string> = {
  check_slots: "Перевіряє розклад та показує вільні слоти для запису",
  book: "Бронює час у розкладі та надсилає SMS-підтвердження",
  price: "Відповідає на запитання про вартість послуг",
};

// POST /api/agents — create agent + optional knowledge base document + tools
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { agent, knowledgeBase, tools } = body;

  if (!agent?.organization_id || !agent?.name) {
    return NextResponse.json({ error: "organization_id and name required" }, { status: 400 });
  }

  const supabase = getServiceClient();

  // Create agent
  const { data: created, error: agentErr } = await supabase
    .from("agents")
    .insert(agent)
    .select("*")
    .single();

  if (agentErr) {
    return NextResponse.json({ error: agentErr.message }, { status: 500 });
  }

  // Create knowledge base document if provided
  let kbDoc = null;
  if (knowledgeBase?.content?.trim()) {
    const { data: doc, error: kbErr } = await supabase
      .from("knowledge_base_documents")
      .insert({
        organization_id: agent.organization_id,
        agent_id: created.id,
        title: knowledgeBase.title || `База знань — ${agent.name}`,
        type: knowledgeBase.type || "markdown",
        content: knowledgeBase.content,
        status: "ready",
        chunks: Math.ceil((knowledgeBase.content.length || 0) / 500),
        size_bytes: new TextEncoder().encode(knowledgeBase.content).length,
      })
      .select()
      .single();

    if (kbErr) {
      console.error("KB document error:", kbErr.message);
    } else {
      kbDoc = doc;
    }
  }

  // Create agent tools if provided
  let createdTools: unknown[] = [];
  if (Array.isArray(tools) && tools.length > 0) {
    const toolRows = tools
      .filter((name: string) => TOOL_DESCRIPTIONS[name])
      .map((name: string) => ({
        agent_id: created.id,
        name,
        description: TOOL_DESCRIPTIONS[name],
        enabled: true,
        parameters: {},
      }));

    if (toolRows.length > 0) {
      const { data: toolsData, error: toolsErr } = await supabase
        .from("agent_tools")
        .insert(toolRows)
        .select();

      if (toolsErr) {
        console.error("Agent tools error:", toolsErr.message);
      } else {
        createdTools = toolsData || [];
      }
    }
  }

  return NextResponse.json({ agent: created, knowledgeBase: kbDoc, tools: createdTools });
}
