import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropic } from "./client";
import { CLAUDE_MODEL } from "./systemPrompt";
import { executeTool, type ToolExecContext } from "./tools";

/**
 * runner.ts
 *
 * Runs one agent "turn" that may involve multiple rounds of tool use, while
 * STREAMING the assistant's visible text out as it's generated.
 *
 * The streaming + tool-use loop is subtle, so here's the model:
 *   - We stream a message. Text deltas are emitted to the caller immediately
 *     (so the UI feels live).
 *   - If the model ends its turn with stop_reason "tool_use", we DON'T show a
 *     final answer yet — we execute the requested tools, append a tool_result
 *     user turn, and stream again. We loop until the model stops for a reason
 *     other than tool_use (or we hit a safety cap on rounds).
 *   - Tool calls are silent to the learner (per the system prompt), so we only
 *     stream text blocks, never tool_use JSON.
 *
 * We emit plain text chunks via the provided `onText` callback. The route
 * adapts that into a web ReadableStream. Keeping the protocol as plain text
 * (not the AI SDK's framed protocol) keeps the client hook tiny and avoids
 * coupling to a specific AI-SDK wire version.
 */

const MAX_TOOL_ROUNDS = 6;

// The SDK doesn't export a single `ContentBlockParam` union, so we name it.
type ContentBlockParam =
  | Anthropic.TextBlockParam
  | Anthropic.ToolUseBlockParam
  | Anthropic.ToolResultBlockParam;

export interface RunAgentArgs {
  system: string;
  messages: Anthropic.MessageParam[];
  tools: Anthropic.Tool[];
  ctx: ToolExecContext;
  /** Called with each text delta as it streams in. */
  onText: (delta: string) => void;
  maxTokens?: number;
}

export interface RunAgentResult {
  /** Full assistant visible text (concatenation of all streamed deltas). */
  text: string;
  /** Tool names that were invoked, in order. */
  toolsUsed: string[];
}

export async function runAgent({
  system,
  messages,
  tools,
  ctx,
  onText,
  maxTokens = 1024,
}: RunAgentArgs): Promise<RunAgentResult> {
  const client = getAnthropic();
  const convo: Anthropic.MessageParam[] = [...messages];
  let fullText = "";
  const toolsUsed: string[] = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    // Each round produces one assistant message. We must reconstruct the
    // assistant content blocks (text + tool_use) to append to the convo if we
    // need another round for tool results.
    const assistantBlocks: ContentBlockParam[] = [];
    const toolUses: Anthropic.ToolUseBlock[] = [];
    let textForThisRound = "";

    const stream = client.messages.stream({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      system,
      tools,
      messages: convo,
    });

    // Stream text deltas to the caller as they arrive.
    stream.on("text", (delta) => {
      textForThisRound += delta;
      fullText += delta;
      onText(delta);
    });

    const finalMessage = await stream.finalMessage();

    // Collect content blocks from the completed message.
    for (const block of finalMessage.content) {
      if (block.type === "text") {
        assistantBlocks.push({ type: "text", text: block.text });
      } else if (block.type === "tool_use") {
        assistantBlocks.push(block as Anthropic.ToolUseBlockParam);
        toolUses.push(block);
      }
    }

    // No tools requested → this is the final answer. Done.
    if (finalMessage.stop_reason !== "tool_use" || toolUses.length === 0) {
      return { text: fullText, toolsUsed };
    }

    // Execute each requested tool and build the tool_result turn.
    convo.push({ role: "assistant", content: assistantBlocks });
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const tu of toolUses) {
      toolsUsed.push(tu.name);
      const result = await executeTool(tu.name, tu.input as Record<string, any>, ctx);
      toolResults.push({
        type: "tool_result",
        tool_use_id: tu.id,
        content: result,
      });
    }
    convo.push({ role: "user", content: toolResults });
    // Loop again so the model can incorporate tool results into its answer.
  }

  // Safety valve: hit the round cap. Return whatever text we have.
  return { text: fullText, toolsUsed };
}
