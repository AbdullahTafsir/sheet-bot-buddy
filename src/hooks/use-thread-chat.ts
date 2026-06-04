import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getThreadMessages } from "@/lib/chat.functions";

export function useThreadChat(threadId: string) {
  const fetchMessages = useServerFn(getThreadMessages);
  const qc = useQueryClient();

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
          const headers: Record<string, string> = token
            ? { Authorization: `Bearer ${token}` }
            : {};
          return {
            body: { messages, threadId, ...(body ?? {}) },
            headers,
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
    const streaming = status === "submitted" || status === "streaming";
    if (streaming !== wasStreaming.current) {
      if (wasStreaming.current && status === "ready") {
        qc.invalidateQueries({ queryKey: ["threads"] });
      }
      wasStreaming.current = streaming;
    }
  }, [status, qc]);

  const [draft, setDraft] = useState("");
  const isBusy = status === "submitted" || status === "streaming";

  const send = (text: string) => {
    if (!text.trim() || isBusy) return;
    sendMessage({ text });
    setDraft("");
  };

  return {
    messages,
    status,
    isBusy,
    draft,
    setDraft,
    send,
    isLoading: initialQ.isLoading,
  };
}
