import type { UIMessage, ChatStatus } from "ai";
import { Fragment } from "react";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { ChartBlock } from "./chart-block";

type Props = {
  messages: UIMessage[];
  status: ChatStatus;
};

// Splits assistant text on ```chart ... ``` fenced blocks and renders charts inline.
function renderAssistantText(text: string) {
  const regex = /```chart\s*\n?([\s\S]*?)```/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = regex.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index);
    if (before.trim()) {
      nodes.push(<MessageResponse key={`t-${i}`}>{before}</MessageResponse>);
    }
    nodes.push(<ChartBlock key={`c-${i}`} raw={match[1].trim()} />);
    lastIndex = match.index + match[0].length;
    i++;
  }
  const tail = text.slice(lastIndex);
  if (tail.trim() || nodes.length === 0) {
    nodes.push(<MessageResponse key={`t-${i}`}>{tail}</MessageResponse>);
  }
  return nodes.map((n, idx) => <Fragment key={idx}>{n}</Fragment>);
}

export function ChatMessages({ messages, status }: Props) {
  return (
    <>
      {messages.map((m) => {
        const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
        return (
          <Message key={m.id} from={m.role}>
            {m.role === "assistant" ? (
              <div className="flex w-full flex-col gap-2 text-sm">
                {renderAssistantText(text)}
              </div>
            ) : (
              <MessageContent className="group-[.is-user]:bg-primary/10 group-[.is-user]:text-foreground">{text}</MessageContent>
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
