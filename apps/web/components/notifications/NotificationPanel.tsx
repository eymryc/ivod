"use client";

import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { notificationsApi } from "@/lib/api/notifications";
import { getNotificationRoute } from "@/lib/notifications/routes";
import { useNotificationSocket } from "@/lib/hooks/useNotificationSocket";
import { formatRelative } from "@/lib/utils/format";

interface NotificationPanelProps {
  /** Page dédiée /notifications */
  standalone?: boolean;
}

export function NotificationPanel({ standalone }: NotificationPanelProps) {
  const router = useRouter();
  const qc = useQueryClient();

  useNotificationSocket();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsApi.list(1, 50),
    staleTime: 30_000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllMutation = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const items: Array<{
    id: string;
    type: string;
    title: string;
    body?: string;
    data?: unknown;
    read: boolean;
    createdAt: string;
  }> = (data as { items?: typeof items })?.items ?? [];
  const unread = items.filter((n) => !n.read).length;

  const handleClick = (n: (typeof items)[number]) => {
    if (!n.read) markReadMutation.mutate(n.id);
    const route = getNotificationRoute(n.type, n.data);
    if (route) router.push(route);
  };

  return (
    <div className={standalone ? "" : "max-h-[70vh] overflow-y-auto"}>
      {standalone && (
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Notifications</h1>
            {unread > 0 && (
              <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs font-bold rounded-full">
                {unread} non lues
              </span>
            )}
          </div>
          {unread > 0 && (
            <button
              onClick={() => markAllMutation.mutate()}
              disabled={markAllMutation.isPending}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-white transition-colors"
            >
              <CheckCheck size={16} />
              Tout marquer lues
            </button>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-surface rounded-xl animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <Bell size={32} className="text-muted-foreground" />
          <p className="text-readable-dim">Aucune notification pour le moment</p>
        </div>
      ) : (
        <div className="space-y-1">
          {items.map((n) => {
            const route = getNotificationRoute(n.type, n.data);
            return (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`w-full text-left px-4 py-3.5 rounded-xl transition-colors flex items-start gap-3 ${
                  !n.read
                    ? "bg-primary/5 hover:bg-primary/10 border border-primary/10"
                    : "hover:bg-surface"
                } ${route ? "cursor-pointer" : "cursor-default"}`}
              >
                {!n.read && (
                  <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" aria-label="Non lu" />
                )}
                {n.read && <span className="w-2 h-2 shrink-0 mt-1.5" />}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${n.read ? "text-readable" : "text-white font-medium"}`}>
                    {n.title}
                  </p>
                  {n.body && (
                    <p className="text-xs text-readable-dim mt-0.5 line-clamp-2">{n.body}</p>
                  )}
                  <p className="text-xs text-readable-muted mt-1">{formatRelative(n.createdAt)}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
