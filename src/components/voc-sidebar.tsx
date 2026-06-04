import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listThreads,
  createThread,
  deleteThread,
  getSettings,
  updateSheetUrl,
} from "@/lib/chat.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, LogOut, MessageSquare, Link2, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import logo from "@/assets/voc-logo.png";

export function Sidebar() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const params = useParams({ strict: false }) as { threadId?: string };
  const activeId = params.threadId;

  const fetchThreads = useServerFn(listThreads);
  const fetchSettings = useServerFn(getSettings);
  const newThread = useServerFn(createThread);
  const removeThread = useServerFn(deleteThread);
  const saveUrl = useServerFn(updateSheetUrl);

  const threadsQ = useQuery({ queryKey: ["threads"], queryFn: () => fetchThreads() });
  const settingsQ = useQuery({ queryKey: ["settings"], queryFn: () => fetchSettings() });

  const [sheetUrl, setSheetUrl] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (settingsQ.data) setSheetUrl(settingsQ.data.sheet_csv_url ?? "");
  }, [settingsQ.data]);

  const create = useMutation({
    mutationFn: () => newThread(),
    onSuccess: (t) => {
      qc.invalidateQueries({ queryKey: ["threads"] });
      nav({ to: "/chat/$threadId", params: { threadId: t.id } });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => removeThread({ data: { id } }),
    onSuccess: async () => {
      const fresh = await qc.fetchQuery({ queryKey: ["threads"], queryFn: () => fetchThreads() });
      if (activeId && !fresh.find((t) => t.id === activeId)) {
        if (fresh[0]) nav({ to: "/chat/$threadId", params: { threadId: fresh[0].id } });
        else nav({ to: "/" });
      }
    },
  });

  const save = useMutation({
    mutationFn: (url: string) => saveUrl({ data: { url } }),
    onSuccess: () => {
      setSaved(true);
      toast.success("Sheet connected");
      setTimeout(() => setSaved(false), 1500);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const signOut = async () => {
    await supabase.auth.signOut();
    nav({ to: "/auth" });
  };

  return (
    <aside className="w-72 shrink-0 h-full flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="px-5 pt-5 pb-4 flex items-center gap-3">
        <img src={logo} alt="" width={36} height={36} />
        <div>
          <div className="text-sm font-bold text-white">VOC Bot</div>
          <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">Intelligence</div>
        </div>
      </div>

      {settingsQ.data?.isAdmin && (
        <div className="px-4 pb-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/60 mb-2">
            Data Source <span className="text-accent">(Admin)</span>
          </div>
          <div className="space-y-2">
            <div className="relative">
              <Link2 className="absolute left-2.5 top-2.5 size-3.5 text-sidebar-foreground/50" />
              <Input
                placeholder="Google Sheet CSV URL"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                className="pl-8 h-9 bg-white/5 border-white/15 text-white text-xs placeholder:text-white/40 focus-visible:ring-accent"
              />
            </div>
            <Button
              size="sm"
              onClick={() => save.mutate(sheetUrl)}
              disabled={save.isPending}
              className="w-full h-8 text-xs bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {saved ? <><Check className="size-3.5" /> Saved</> : save.isPending ? "Saving…" : "Connect Sheet"}
            </Button>
            <p className="text-[10px] text-sidebar-foreground/50 leading-relaxed">
              Shared with all users. In Sheets: File → Share → Publish to web → CSV.
            </p>
          </div>
        </div>
      )}

      <div className="px-4 pb-2">
        <Button
          onClick={() => create.mutate()}
          disabled={create.isPending}
          className="w-full justify-start gap-2 bg-white/10 hover:bg-white/15 text-white border border-white/10"
        >
          <Plus className="size-4" /> New chat
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/60 px-2 py-2">
          Conversations
        </div>
        <ul className="space-y-0.5">
          {threadsQ.data?.map((t) => (
            <li key={t.id}>
              <div
                className={`group flex items-center gap-2 px-2 py-2 rounded-md text-sm cursor-pointer transition-colors ${
                  activeId === t.id ? "bg-white/15 text-white" : "text-sidebar-foreground/80 hover:bg-white/5"
                }`}
              >
                <Link
                  to="/chat/$threadId"
                  params={{ threadId: t.id }}
                  className="flex items-center gap-2 flex-1 min-w-0"
                >
                  <MessageSquare className="size-3.5 shrink-0 opacity-70" />
                  <span className="truncate">{t.title}</span>
                </Link>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (confirm("Delete this chat?")) remove.mutate(t.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition text-sidebar-foreground/60 hover:text-destructive"
                  aria-label="Delete"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </li>
          ))}
          {threadsQ.data?.length === 0 && (
            <li className="px-2 py-3 text-xs text-sidebar-foreground/50">No conversations yet.</li>
          )}
        </ul>
      </div>

      <div className="p-3 border-t border-white/10">
        <Button onClick={signOut} variant="ghost" className="w-full justify-start gap-2 text-sidebar-foreground/80 hover:bg-white/5 hover:text-white">
          <LogOut className="size-4" /> Sign out
        </Button>
      </div>
    </aside>
  );
}
