import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatEmptyState } from "@/components/chat/chat-empty-state";
import { ChatMessages } from "@/components/chat/chat-messages";
import { ChatComposer } from "@/components/chat/chat-composer";
import { useThreadChat } from "@/hooks/use-thread-chat";

export const Route = createFileRoute("/_authenticated/chat/$threadId")({
  component: ChatPage,
});

function ChatPage() {
  const { threadId } = useParams({ from: "/_authenticated/chat/$threadId" });
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const { messages, status, isBusy, draft, setDraft, send, isLoading } =
    useThreadChat(threadId);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [threadId, status]);

  return (
    <div className="flex flex-col h-full bg-background">
      <ChatHeader />

      <Conversation className="flex-1">
        <ConversationContent className="max-w-3xl mx-auto w-full px-4">
          {messages.length === 0 && !isLoading && <ChatEmptyState onPick={send} />}
          <ChatMessages messages={messages} status={status} />
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <ChatComposer
        ref={textareaRef}
        value={draft}
        onChange={setDraft}
        onSubmit={send}
        status={status}
        isBusy={isBusy}
      />
    </div>
  );
}
