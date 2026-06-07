import logo from "@/assets/vog-logo.png";

const SUGGESTIONS = [
  "Summarize the top customer complaints",
  "What are the most common positive themes?",
  "Show sentiment breakdown by category",
  "List 5 verbatim quotes about pricing",
];

export function ChatEmptyState({ onPick }: { onPick: (s: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <img src={logo} alt="" width={56} height={56} className="mb-5 opacity-90 rounded-xl" />
      <h2 className="text-3xl text-foreground" style={{ fontFamily: "'Georgia', serif" }}>
        How can I help today?
      </h2>
      <p className="text-sm text-muted-foreground mt-1 mb-6">
        I read directly from your connected Google Sheet.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="text-left text-sm px-4 py-3 rounded-lg border border-border bg-card hover:bg-accent transition-colors text-foreground"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
