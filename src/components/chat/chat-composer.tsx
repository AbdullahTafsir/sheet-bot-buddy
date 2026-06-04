import { forwardRef } from "react";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (text: string) => void;
  status: string;
  isBusy: boolean;
};

export const ChatComposer = forwardRef<HTMLTextAreaElement, Props>(
  ({ value, onChange, onSubmit, status, isBusy }, ref) => {
    return (
      <div className="border-t border-border p-4">
        <div className="max-w-3xl mx-auto">
          <PromptInput onSubmit={(msg) => onSubmit(msg.text ?? "")}>
            <PromptInputTextarea
              ref={ref}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Ask about your VOC data…"
            />
            <PromptInputFooter className="justify-end">
              <PromptInputSubmit status={status} disabled={!value.trim() || isBusy} />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    );
  },
);
ChatComposer.displayName = "ChatComposer";
