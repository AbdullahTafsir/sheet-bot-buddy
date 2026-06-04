import type { UIMessage, ChatStatus } from "ai";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { Shimmer } from "@/components/ai-elements/shimmer";

type Props = {
  messages: UIMessage[];
  status: ChatStatus;
};

export function ChatMessages({ messages, status }: Props) {
  return (
    <>
      {messages.map((m) => {
        const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
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
    </>
  );
}
