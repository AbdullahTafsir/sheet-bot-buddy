import { createFileRoute, redirect } from "@tanstack/react-router";
import { createThread, listThreads } from "@/lib/chat.functions";

export const Route = createFileRoute("/_authenticated/")({
  beforeLoad: async () => {
    const threads = await listThreads();
    const first = threads[0];
    if (first) throw redirect({ to: "/chat/$threadId", params: { threadId: first.id } });
    const created = await createThread();
    throw redirect({ to: "/chat/$threadId", params: { threadId: created.id } });
  },
  component: () => null,
});
