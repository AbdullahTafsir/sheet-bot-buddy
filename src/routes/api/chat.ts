import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";

type ChatBody = { messages?: UIMessage[]; threadId?: string };

const MAX_SHEET_CHARS = 60_000;

async function fetchSheetContext(url: string | null): Promise<string> {
  if (!url) return "";
  try {
    const res = await fetch(url, { headers: { "user-agent": "voc-bot" } });
    if (!res.ok) return `(Failed to load sheet: HTTP ${res.status})`;
    const text = await res.text();
    return text.length > MAX_SHEET_CHARS
      ? text.slice(0, MAX_SHEET_CHARS) + "\n\n[...truncated...]"
      : text;
  } catch (e) {
    return `(Failed to load sheet: ${(e as Error).message})`;
  }
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization");
        if (!auth?.startsWith("Bearer ")) {
          return new Response("Unauthorized", { status: 401 });
        }
        const token = auth.slice(7);

        const SUPABASE_URL = process.env.SUPABASE_URL!;
        const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: userData, error: userErr } = await supabase.auth.getUser(token);
        if (userErr || !userData.user) return new Response("Unauthorized", { status: 401 });
        const userId = userData.user.id;

        const { messages, threadId } = (await request.json()) as ChatBody;
        if (!Array.isArray(messages) || !threadId) {
          return new Response("Bad request", { status: 400 });
        }

        // Verify thread belongs to user
        const { data: thread } = await supabase
          .from("threads")
          .select("id,title")
          .eq("id", threadId)
          .maybeSingle();
        if (!thread) return new Response("Thread not found", { status: 404 });

        // Fetch shared sheet URL (admin-managed, readable by all signed-in users)
        const { data: settings } = await supabase
          .from("app_settings")
          .select("sheet_csv_url")
          .eq("id", true)
          .maybeSingle();
        const sheetCsv = await fetchSheetContext(settings?.sheet_csv_url ?? null);

        const systemPrompt = `You are VOC Intelligence Bot — a sharp analyst answering questions about the Voice-of-Customer CSV below.

Response style (STRICT):
- Be SHORT and punchy. Target 60–120 words unless the user explicitly asks for depth.
- Lead with a 1-sentence headline insight in **bold**.
- Then 2–4 tight bullets with concrete numbers (%, counts) — no fluff, no restating the question, no generic advice.
- Use a compact **markdown table** whenever comparing categories, themes, sentiment, rankings, or distributions (max ~6 rows). Include a numeric column (%, count, or score). Do NOT draw ASCII/Unicode bar charts with block characters (▇ █ ░ ▓ etc.) — they render as ugly black boxes.
- Include 1 short verbatim quote in *italics* only when it sharpens the point.
- End with a single 👉 **Takeaway:** line (one sentence, actionable).
- If the data can't answer the question, say so in one line. Don't speculate.
- Never dump raw CSV. Never add preambles like "Sure" or "Based on the data".

=== DATA (CSV) ===
${sheetCsv || "(No sheet connected yet. The admin needs to paste a Google Sheet 'publish to web' CSV URL in the sidebar.)"}
=== END DATA ===`;

        // Persist the latest user message
        const lastUser = [...messages].reverse().find((m) => m.role === "user");
        if (lastUser) {
          await supabase.from("messages").insert({
            thread_id: threadId,
            user_id: userId,
            role: "user",
            parts: lastUser.parts as unknown as object,
          });
          // Auto-title from first user message
          if (thread.title === "New chat") {
            const text = lastUser.parts
              .map((p) => (p.type === "text" ? p.text : ""))
              .join(" ")
              .trim()
              .slice(0, 80);
            if (text) {
              await supabase.from("threads").update({ title: text, updated_at: new Date().toISOString() }).eq("id", threadId);
            }
          } else {
            await supabase.from("threads").update({ updated_at: new Date().toISOString() }).eq("id", threadId);
          }
        }

        const gateway = createLovableAiGatewayProvider(apiKey);
        const result = streamText({
          model: gateway("google/gemini-3-flash-preview"),
          system: systemPrompt,
          messages: await convertToModelMessages(messages),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages,
          onFinish: async ({ messages: finalMessages }) => {
            const assistant = [...finalMessages].reverse().find((m) => m.role === "assistant");
            if (assistant) {
              await supabase.from("messages").insert({
                thread_id: threadId,
                user_id: userId,
                role: "assistant",
                parts: assistant.parts as unknown as object,
              });
            }
          },
        });
      },
    },
  },
});
