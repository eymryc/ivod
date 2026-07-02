"use client";
import { useState } from "react";
import { Bell } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "@/lib/api/notifications";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useNotificationSocket } from "@/lib/hooks/useNotificationSocket";
import { formatRelative } from "@/lib/utils/format";

export function NotificationBell({ embedded = false }: { embedded?: boolean }) {
  const [open, setOpen] = useState(false);
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const qc = useQueryClient();

  useNotificationSocket();

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsApi.list(1, 20),
    enabled: isAuth,
    staleTime: 30_000,
  });

  const markAllMutation = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const items: Array<{
    id: string;
    title: string;
    body?: string;
    read: boolean;
    createdAt: string;
  }> = (data as { items?: typeof items })?.items ?? [];
  const unread = items.filter((n: any) => !n.read).length;

  const btnClass = embedded
    ? "relative flex h-10 w-10 shrink-0 items-center justify-center border-r border-white/[0.12] text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors"
    : "relative flex h-9 w-9 shrink-0 items-center justify-center border border-white/[0.06] bg-white/[0.02] text-white/45 transition-colors hover:bg-white/[0.04] hover:text-white/80";

  return (
    <div className={`relative ${embedded ? "flex" : ""}`}>
      <button
        type="button"
        onClick={() => { setOpen(!open); if (!open && unread > 0) markAllMutation.mutate(); }}
        className={btnClass}
        aria-label="Notifications"
      >
        <Bell size={15} strokeWidth={1.5} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 ivod-gradient rounded-none text-[10px] font-bold flex items-center justify-center text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-[#0c0c14]/95 backdrop-blur-2xl border border-white/[0.08] rounded-none shadow-[0_24px_64px_-16px_rgba(0,0,0,0.85)] overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <span className="text-sm font-semibold">Notifications</span>
            {unread > 0 && (
              <button onClick={() => markAllMutation.mutate()} className="text-xs text-brand-magenta hover:text-brand-orange">
                Tout lire
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Aucune notification</p>
            ) : (
              items.map((n: any) => (
                <div key={n.id} className={`px-4 py-3 border-b border-white/5 last:border-0 ${!n.read ? "bg-primary/5" : ""}`}>
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatRelative(n.createdAt)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
