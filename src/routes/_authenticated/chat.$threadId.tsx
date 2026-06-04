import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getThreadMessages } from "@/lib/chat.functions";
import logo from "@/assets/voc-logo.png";

export const Route = createFileRoute("/_authenticated/chat/$threadId")({
  component: ChatPage,
});

const SUGGESTIONS = [
  "Summarize the top customer complaints",
  "What are the most common positive themes?",
  "Show sentiment breakdown by category",
  "List 5 verbatim quotes about pricing",
];

function ChatPage() {
  const { threadId } = useParams({ from: "/_authenticated/chat/$threadId" });
  const fetchMessages = useServerFn(getThreadMessages);
  const qc = useQueryClient();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const initialQ = useQuery({
    queryKey: ["thread-messages", threadId],
    queryFn: () => fetchMessages({ data: { threadId } }),
  });

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: async ({ messages, body }) => {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          return {
            body: { messages, threadId, ...(body ?? {}) },
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          };
        },
      }),
    [threadId],
  );

  const { messages, sendMessage, status, setMessages } = useChat({
    id: threadId,
    transport,
  });

  // Hydrate from db
  useEffect(() => {
    if (initialQ.data) setMessages(initialQ.data as unknown as UIMessage[]);
  }, [initialQ.data, setMessages]);

  // Refresh thread list when assistant finishes (for title update)
  const wasStreaming = useRef(false);
  useEffect(() => {
    if ((status === "submitted" || status === "streaming") !== wasStreaming.current) {
      if (wasStreaming.current && status === "ready") {
        qc.invalidateQueries({ queryKey: ["threads"] });
      }
      wasStreaming.current = status === "submitted" || status === "streaming";
    }
  }, [status, qc]);

  // Focus textarea
  useEffect(() => {
    textareaRef.current?.focus();
  }, [threadId, status]);

  const [draft, setDraft] = useState("");
  const isBusy = status === "submitted" || status === "streaming";

  const send = (text: string) => {
    if (!text.trim() || isBusy) return;
    sendMessage({ text });
    setDraft("");
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <header className="border-b border-border px-6 py-3 flex items-center gap-3">
        <img src={logo} alt="VOC" width={28} height={28} />
        <div>
          <h1 className="text-sm font-semibold text-foreground">VOC Intelligence Bot</h1>
          <p className="text-[11px] text-muted-foreground">Ask anything about your customer feedback data</p>
        </div>
      </header>

      <Conversation className="flex-1">
        <ConversationContent className="max-w-3xl mx-auto w-full px-4">
          {messages.length === 0 && !initialQ.isLoading && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <img src={logo} alt="" width={72} height={72} className="mb-4 opacity-90" />
              <h2 className="text-xl font-semibold text-foreground">How can I help with your VOC data?</h2>
              <p className="text-sm text-muted-foreground mt-1 mb-6">
                I read directly from your connected Google Sheet.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-left text-sm px-4 py-3 rounded-lg border border-border bg-card hover:bg-accent transition-colors text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => {
            const text = m.parts
              .map((p) => (p.type === "text" ? p.text : ""))
              .join("");
            return (
              <Message key={m.id} from={m.role}>
                {m.role === "assistant" ? (
                  <MessageResponse>{text}</MessageResponse>
                ) : (
                  <MessageContent>{text}</MessageContent>
                )}
              </Message>
            );
          })}

          {status === "submitted" && (
            <Message from="assistant">
              <Shimmer>Thinking…</Shimmer>
            </Message>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t border-border p-4">
        <div className="max-w-3xl mx-auto">
          <PromptInput
            onSubmit={(msg) => {
              send(msg.text ?? "");
            }}
          >
            <PromptInputTextarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask about your VOC data…"
            />
            <PromptInputFooter className="justify-end">
              <PromptInputSubmit status={status} disabled={!draft.trim() || isBusy} />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}
