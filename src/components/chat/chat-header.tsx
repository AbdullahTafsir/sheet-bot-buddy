import logo from "@/assets/voc-logo.png";

export function ChatHeader() {
  return (
    <header className="border-b border-border px-6 py-3 flex items-center gap-3 bg-background/80 backdrop-blur">
      <img src={logo} alt="VOC" width={26} height={26} className="rounded" />
      <div>
        <h1
          className="text-sm font-semibold text-foreground"
          style={{ fontFamily: "'Georgia', serif" }}
        >
          VOC Intelligence
        </h1>
        <p className="text-[11px] text-muted-foreground">
          Ask anything about your customer feedback
        </p>
      </div>
    </header>
  );
}
